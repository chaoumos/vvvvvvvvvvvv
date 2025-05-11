
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  type Unsubscribe,
  getDoc, 
  setDoc, // Added setDoc for saving/updating API connections
} from 'firebase/firestore';
import { db } from './client-config';
import type { Blog, BlogStatus, SelectedTheme, ApiConnection } from '../types';

const BLOGS_COLLECTION = 'blogs';
const API_CONNECTIONS_COLLECTION = 'api_connections';

// Add a new blog
export async function addBlog(userId: string, blogData: Omit<Blog, 'id' | 'userId' | 'createdAt' | 'status'>): Promise<string> {
  try {
    if (!db) {
      throw new Error("Firestore database is not initialized.");
    }
    const docRef = await addDoc(collection(db, BLOGS_COLLECTION), {
      ...blogData,
      userId,
      status: 'pending' as BlogStatus,
      createdAt: Timestamp.now(), // Firestore Timestamp
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding blog:', error);
    throw new Error('Failed to add blog to Firestore.');
  }
}

// Get all blogs for a user
export async function getUserBlogs(userId: string): Promise<Blog[]> {
  try {
    if (!db) {
      throw new Error("Firestore database is not initialized.");
    }
    const q = query(
      collection(db, BLOGS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      const createdAtTimestamp = data.createdAt as Timestamp;
      return {
        id: docSnapshot.id,
        ...data,
        createdAt: createdAtTimestamp?.toMillis ? createdAtTimestamp.toMillis() : (data.createdAt || 0),
      } as Blog;
    });
  } catch (error) {
    console.error('Error fetching user blogs:', error);
    throw new Error('Failed to fetch user blogs.');
  }
}

// Stream user blogs
export function streamUserBlogs(
  userId: string,
  onUpdate: (blogs: Blog[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!db) {
    onError(new Error("Firestore database is not initialized. Cannot stream blogs."));
    return () => {}; // Return a no-op unsubscribe function
  }
  const q = query(
    collection(db, BLOGS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc') 
  );

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const blogs = querySnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      const createdAtTimestamp = data.createdAt as Timestamp;
      return {
        id: docSnapshot.id,
        ...data,
        createdAt: createdAtTimestamp?.toMillis ? createdAtTimestamp.toMillis() : (data.createdAt || 0),
      } as Blog;
    });
    onUpdate(blogs);
  }, (err) => { 
    console.error("Error streaming user blogs from Firestore:", err);
    let errorMessage = err.message || 'An unknown error occurred while streaming blogs.';
    if (err.code === 'failed-precondition' && err.message.includes('query requires an index')) {
        errorMessage = `Firestore query requires an index. Please create it in the Firebase console. Details: ${err.message}`;
    } else if (err.code === 'permission-denied') {
        errorMessage = `Permission denied when trying to stream blogs. Check Firestore security rules. Details: ${err.message}`;
    }
    onError(new Error(errorMessage));
  });

  return unsubscribe;
}


// Update blog status
export async function updateBlogStatus(blogId: string, status: BlogStatus, details?: Partial<Pick<Blog, 'githubRepoUrl' | 'liveUrl' | 'error'>>): Promise<void> {
  try {
    if (!db) {
      throw new Error("Firestore database is not initialized.");
    }
    const blogRef = doc(db, BLOGS_COLLECTION, blogId);
    await updateDoc(blogRef, { status, ...details });
  } catch (error) {
    console.error('Error updating blog status:', error);
    throw new Error('Failed to update blog status.');
  }
}

// Delete a blog
export async function deleteBlog(blogId: string): Promise<void> {
  try {
    if (!db) {
      throw new Error("Firestore database is not initialized.");
    }
    const blogRef = doc(db, BLOGS_COLLECTION, blogId);
    await deleteDoc(blogRef);
  } catch (error) {
    console.error('Error deleting blog:', error);
    throw new Error('Failed to delete blog.');
  }
}

export async function simulateBlogCreationProcess(blogId: string, siteName: string): Promise<void> {
  if (!db) {
    console.error("Firestore is not initialized. Cannot simulate blog creation.");
    // Attempt to update status to failed even if db is not initialized on this client,
    // though this specific call might fail if db is truly globally uninitialized.
    // This is more of a fallback.
    try {
        await updateBlogStatus(blogId, 'failed', { error: "Firestore not initialized during creation simulation." });
    } catch (statusUpdateError) {
        console.error("Failed to update blog status to failed after Firestore initialization check:", statusUpdateError);
    }
    return;
  }

  try {
    await updateBlogStatus(blogId, 'creating_repo');

    const blogDocRef = doc(db, BLOGS_COLLECTION, blogId);
    const blogDocSnapshot = await getDoc(blogDocRef);

    if (!blogDocSnapshot.exists()) {
      throw new Error(`Blog with ID ${blogId} not found.`);
    }
    const blogData = blogDocSnapshot.data() as Blog;
    const githubPat = blogData.pat;

    if (!githubPat) {
        await updateBlogStatus(blogId, 'failed', { error: 'GitHub Personal Access Token is missing. Cannot create repository.' });
        return;
    }

    const response = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubPat}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        name: siteName,
        description: blogData.description || 'A Hugo blog generated by HugoHost',
        private: false, 
      }),
    });

    if (response.ok) {
      const responseBody = await response.json();
      const githubRepoUrl = responseBody.html_url;
      await updateBlogStatus(blogId, 'live', { githubRepoUrl, liveUrl: 'Deployment setup pending...' });
    } else {
      const status = response.status;
      let finalUserMessage = `Failed to create GitHub repository (Status: ${status})`; 

      try {
        const errorText = await response.text();
        let errorJson: any = null;
        
        try {
          errorJson = JSON.parse(errorText);
          console.error(`GitHub API Error (Status: ${status}, Parsed JSON):`, errorJson);

          let githubProvidedMessage = "";
          if (errorJson && typeof errorJson.message === 'string') {
            githubProvidedMessage = errorJson.message;
          }
          
          if (errorJson && Array.isArray(errorJson.errors) && errorJson.errors.length > 0) {
            const validationDetails = errorJson.errors.map((e: any) => {
              let msg = e.message || JSON.stringify(e);
              if (e.field) msg = `${e.field}: ${msg}`;
              return msg;
            }).join('; ');

            if (githubProvidedMessage) {
              githubProvidedMessage += ` Details: ${validationDetails}`;
            } else {
              githubProvidedMessage = `Validation errors: ${validationDetails}`;
            }
          }

          if (githubProvidedMessage) {
            finalUserMessage = githubProvidedMessage;
          } else if (errorText && errorText.trim() !== '{}' && errorText.trim() !== '') {
            finalUserMessage += `. GitHub's raw response: ${errorText.substring(0, 200)}${errorText.length > 200 ? '...' : ''}`;
          } else {
             finalUserMessage += ". GitHub returned an empty or non-standard error response.";
          }

        } catch (parseError) {
          console.error(`GitHub API Error (Status: ${status}, Non-JSON Response):`, errorText);
          if (errorText && errorText.trim() !== '') {
            finalUserMessage += `. Raw response: ${errorText.substring(0, 200)}${errorText.length > 200 ? '...' : ''}`;
          } else {
            finalUserMessage += ". Failed to parse GitHub's error response, which was empty or malformed.";
          }
        }
      } catch (readError) {
        console.error(`GitHub API Error (Status: ${status}, Failed to read response body):`, readError);
        finalUserMessage += '. Additionally, the system failed to read the error response body from GitHub.';
      }
      
      let firestoreErrorMessage = `GitHub API Error: ${finalUserMessage}`;
      if (firestoreErrorMessage.length > 1000) {
        firestoreErrorMessage = firestoreErrorMessage.substring(0, 997) + "...";
      }
      await updateBlogStatus(blogId, 'failed', { error: firestoreErrorMessage });
    }

  } catch (error: any) {
    console.error("Error in blog creation simulation:", error);
    let simulationErrorMessage = `Simulation process failed: ${error.message || 'Unknown error'}`;
    if (simulationErrorMessage.length > 1000) {
        simulationErrorMessage = simulationErrorMessage.substring(0, 997) + "...";
    }
    // Ensure updateBlogStatus is called even if some prior step failed
    try {
        await updateBlogStatus(blogId, 'failed', { error: simulationErrorMessage });
    } catch (statusUpdateError) {
        console.error("Failed to update blog status to failed after simulation error:", statusUpdateError);
    }
  }
}

// Save API connections for a user
export async function saveApiConnection(userId: string, data: Partial<Omit<ApiConnection, 'userId'>>): Promise<void> {
  try {
    if (!db) {
      throw new Error("Firestore database is not initialized.");
    }
    if (!userId) {
      throw new Error("User ID is required to save API connections.");
    }
    const apiConnectionRef = doc(db, API_CONNECTIONS_COLLECTION, userId);
    // Use setDoc with merge: true to create or update the document
    await setDoc(apiConnectionRef, { ...data, userId }, { merge: true });
  } catch (error) {
    console.error('Error saving API connection:', error);
    throw new Error('Failed to save API connection to Firestore.');
  }
}

// Get API connections for a user
export async function getApiConnection(userId: string): Promise<ApiConnection | null> {
  try {
    if (!db) {
      throw new Error("Firestore database is not initialized.");
    }
    if (!userId) {
      throw new Error("User ID is required to get API connections.");
    }
    const apiConnectionRef = doc(db, API_CONNECTIONS_COLLECTION, userId);
    const docSnapshot = await getDoc(apiConnectionRef);

    if (docSnapshot.exists()) {
      return { id: docSnapshot.id, ...docSnapshot.data() } as ApiConnection;
    }
    return null;
  } catch (error) {
    console.error('Error fetching API connection:', error);
    throw new Error('Failed to fetch API connection from Firestore.');
  }
}
