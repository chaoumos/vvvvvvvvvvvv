
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
  getDoc, // Added getDoc for fetching single document by ref
} from 'firebase/firestore';
import { db } from './client-config';
import type { Blog, BlogStatus, SelectedTheme } from '../types';

const BLOGS_COLLECTION = 'blogs';

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
      let finalUserMessage = `Failed to create GitHub repository (Status: ${status})`; // Default base message

      try {
        const errorText = await response.text();
        let errorJson: any = null;
        
        try {
          errorJson = JSON.parse(errorText);
          console.error(`GitHub API Error (Status: ${status}, Parsed JSON):`, errorJson); // This is the line from the error report

          let githubProvidedMessage = "";
          if (errorJson && typeof errorJson.message === 'string') {
            githubProvidedMessage = errorJson.message;
          }
          
          if (errorJson && Array.isArray(errorJson.errors) && errorJson.errors.length > 0) {
            const validationDetails = errorJson.errors.map((e: any) => e.message || JSON.stringify(e)).join('; ');
            if (githubProvidedMessage) {
              githubProvidedMessage += ` Details: ${validationDetails}`;
            } else {
              githubProvidedMessage = `Validation errors: ${validationDetails}`;
            }
          }

          if (githubProvidedMessage) {
            // If GitHub provided specific messages, use them as the primary error.
            finalUserMessage = githubProvidedMessage;
          } else if (errorText && errorText.trim() !== '{}' && errorText.trim() !== '') {
            // If no specific messages from errorJson, but errorText is useful (not empty or just "{}")
            finalUserMessage += `. GitHub's raw response: ${errorText.substring(0, 200)}${errorText.length > 200 ? '...' : ''}`;
          } else {
            // If errorText was empty or just "{}" after parsing an empty JSON
            finalUserMessage += ". GitHub returned an empty or non-standard error.";
          }

        } catch (parseError) {
          // Body was not valid JSON
          console.error(`GitHub API Error (Status: ${status}, Non-JSON Response):`, errorText);
          if (errorText && errorText.trim() !== '') {
            finalUserMessage += `. Raw response: ${errorText.substring(0, 200)}${errorText.length > 200 ? '...' : ''}`;
          } else {
            finalUserMessage += ". Failed to parse GitHub's error response, which was empty or malformed.";
          }
        }
      } catch (readError) {
        // Failed to read response body at all
        console.error(`GitHub API Error (Status: ${status}, Failed to read response body):`, readError);
        finalUserMessage += '. Additionally, the system failed to read the error response body from GitHub.';
      }
      
      // Ensure the message stored in Firestore is prefixed for clarity and truncated.
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
    await updateBlogStatus(blogId, 'failed', { error: simulationErrorMessage });
  }
}

