
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
  setDoc,
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
      createdAt: Timestamp.now(), 
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
    const initError = new Error("Firestore database is not initialized. Cannot stream blogs.");
    console.error(initError.message); 
    onError(initError);
    return () => {}; 
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
  }, (err: any) => { 
    console.error("Error streaming user blogs from Firestore:", err);
    let errorMessage = err.message || 'An unknown error occurred while streaming blogs.';
    if (err.code === 'failed-precondition' && err.message.includes('query requires an index')) {
        errorMessage = `Firestore query requires an index. Please create it in the Firebase console. Details: ${err.message}`;
    } else if (err.code === 'permission-denied') {
        errorMessage = `Permission denied when trying to stream blogs. Check Firestore security rules. Details: ${err.message}`;
    } else if (err.code === 'unimplemented' && err.message.includes('currently building')) {
      errorMessage = `The required Firestore index is currently building and cannot be used yet. Please try again in a few minutes. Original error: ${err.message}`;
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
    const firestoreErrorMsg = "Firestore not initialized during creation simulation.";
    console.error(firestoreErrorMsg);
    try {
        await updateBlogStatus(blogId, 'failed', { error: firestoreErrorMsg });
    } catch (statusUpdateError) {
        console.error("Failed to update blog status to failed after Firestore initialization check:", statusUpdateError);
    }
    return;
  }

  let blogData: Blog | undefined;

  try {
    await updateBlogStatus(blogId, 'creating_repo');

    const blogDocRef = doc(db, BLOGS_COLLECTION, blogId);
    const blogDocSnapshot = await getDoc(blogDocRef);

    if (!blogDocSnapshot.exists()) {
      throw new Error(`Blog with ID ${blogId} not found.`);
    }
    blogData = blogDocSnapshot.data() as Blog; 
    const userId = blogData?.userId;

    if (!userId) { throw new Error('User ID not found in blog document.'); }

    const apiConnections = await getApiConnection(userId);
    const githubApiKey = apiConnections?.githubApiKey; 

    if (!githubApiKey) { throw new Error('GitHub API key is missing. Please add your GitHub Personal Access Token in the API Connections settings.'); }

    const sanitizedDescription = (blogData.description || 'A Hugo blog generated by HugoHost')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ') // Remove control characters
      .replace(/\s\s+/g, ' ') // Replace multiple spaces with a single space
      .trim();


    const response = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        name: siteName, 
        description: sanitizedDescription, 
        private: false, 
      }),
    });
    
    let responseBodyText = "";
    try {
        responseBodyText = await response.text();
    } catch (textError) {
        console.warn("Could not read response body as text from GitHub API.", textError);
    }


    if (response.ok) {
      let responseJson;
      try {
        responseJson = JSON.parse(responseBodyText);
      } catch (e) {
        await updateBlogStatus(blogId, 'failed', { error: `Successfully created repo but failed to parse GitHub response. Status: ${response.status}` });
        return;
      }
      const githubRepoUrl = responseJson.html_url;
      await updateBlogStatus(blogId, 'live', { githubRepoUrl, liveUrl: 'Deployment setup pending...' });
    } else {
      const status = response.status;
      let apiErrorMessage = `Failed to create GitHub repository (Status: ${status}).`;

      if (responseBodyText) {
        try {
          const errorJson = JSON.parse(responseBodyText);
          console.error(`GitHub API Error (Status: ${status}, Parsed JSON):`, JSON.stringify(errorJson, null, 2)); 

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
            apiErrorMessage = githubProvidedMessage; 
          } else if (responseBodyText.trim() !== '{}' && responseBodyText.trim() !== '') {
             apiErrorMessage += ` GitHub's raw response: ${responseBodyText.substring(0, 200)}${responseBodyText.length > 200 ? '...' : ''}`;
          } else {
             apiErrorMessage += " GitHub returned an empty or non-standard error response.";
          }

        } catch (parseError) {
          console.error(`GitHub API Error (Status: ${status}, Non-JSON Response):`, responseBodyText);
          apiErrorMessage += ` Raw response: ${responseBodyText.substring(0, 200)}${responseBodyText.length > 200 ? '...' : ''}`;
        }
      } else {
        apiErrorMessage += " No additional error details from GitHub response.";
      }
      
      let firestoreErrorMessage = `GitHub API Error: ${apiErrorMessage}`;
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
      throw new Error("Firestore database is not initialized. Cannot save API connections.");
    }
    if (!userId) {
      throw new Error("User ID is missing. Unable to save API connections.");
    }
    const apiConnectionRef = doc(db, API_CONNECTIONS_COLLECTION, userId);
    
    const dataToSave: Partial<ApiConnection> = { userId };
    // Only include keys that have a defined value (including empty strings)
    // This prevents accidental overwriting of existing fields with undefined if they are not in the form.
    (Object.keys(data) as Array<keyof Omit<ApiConnection, 'userId'>>).forEach(key => {
      if (data[key] !== undefined) {
        (dataToSave as any)[key] = data[key];
      }
    });


    await setDoc(apiConnectionRef, dataToSave, { merge: true });
  } catch (error: any) {
    console.error('Detailed error saving API connection to Firestore:', error); 

    let toastMessage = "Failed to save API connections.";
    if (error.code === 'permission-denied') {
        toastMessage += " Please check Firestore security rules to ensure you have write access.";
    } else if (error.message) {
        const detailSnippet = error.message.length > 100 ? error.message.substring(0,97) + "..." : error.message;
        toastMessage += ` Details: ${detailSnippet}`;
    } else {
        toastMessage += " An unexpected issue occurred. More details logged on the server.";
    }
     if (toastMessage.length > 250) {
        toastMessage = toastMessage.substring(0, 247) + "...";
    }
    throw new Error(toastMessage); 
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
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id, // id is not part of ApiConnection, but good to have for Firestore context
        userId: data.userId,
        githubApiKey: data.githubApiKey || undefined,
        cloudflareApiToken: data.cloudflareApiToken || undefined,
        cloudflareApiKey: data.cloudflareApiKey || undefined,
        cloudflareEmail: data.cloudflareEmail || undefined,
        cloudflareAccountId: data.cloudflareAccountId || undefined,
      } as ApiConnection; // Cast because 'id' is not in ApiConnection type
    }
    return null;
  } catch (error) {
    console.error('Error fetching API connection:', error);
    throw new Error('Failed to fetch API connection from Firestore.');
  }
}
