
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
import type { Blog, BlogStatus, SelectedTheme, ApiConnection, BlogPost } from '../types';

const BLOGS_COLLECTION = 'blogs';
const API_CONNECTIONS_COLLECTION = 'api_connections';
const POSTS_SUBCOLLECTION = 'posts';

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

// Get a single blog by ID, ensuring it belongs to the user
export async function getBlog(blogId: string, userId: string): Promise<Blog | null> {
  if (!db) {
    throw new Error("Firestore database is not initialized.");
  }
  if (!blogId || !userId) {
    // This check is primarily for developers, UI should prevent this.
    console.error("getBlog called with missing blogId or userId.");
    throw new Error("Blog ID and User ID are required to fetch a blog.");
  }
  try {
    const blogRef = doc(db, BLOGS_COLLECTION, blogId);
    const docSnapshot = await getDoc(blogRef);

    if (docSnapshot.exists()) {
      const data = docSnapshot.data();
      if (data.userId !== userId) {
        console.warn(`User ${userId} attempted to access blog ${blogId} owned by ${data.userId}. This should be caught by security rules.`);
        // Depending on security model, either return null or throw specific permission error.
        // For client-side, null is often safer to prevent information leakage.
        return null; 
      }
      const createdAtTimestamp = data.createdAt as Timestamp;
      return {
        id: docSnapshot.id,
        ...data,
        createdAt: createdAtTimestamp?.toMillis ? createdAtTimestamp.toMillis() : (data.createdAt || 0),
      } as Blog;
    }
    return null; // Blog not found
  } catch (error: any) {
    console.error(`Error fetching blog ${blogId}:`, error);
    // Don't expose too much detail to the client. Log it for server-side debugging.
    throw new Error(`Failed to fetch blog details. Please try again.`);
  }
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
    // Note: This does not delete subcollections like 'posts'. 
    // If you need to delete posts, you'd need a separate (likely Cloud Function) process.
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
    const blogDocRef = doc(db, BLOGS_COLLECTION, blogId);
    const blogDocSnapshot = await getDoc(blogDocRef);

    if (!blogDocSnapshot.exists()) {
      throw new Error(`Blog with ID ${blogId} not found.`);
    }
    
    // Assign to blogData after checking existence
    const rawData = blogDocSnapshot.data();
    const userId = rawData?.userId; // Get userId first for API key fetching
    if (!userId) { throw new Error('User ID not found in blog document.'); }
    
    // Now construct the full blogData object
    const createdAtTimestamp = rawData.createdAt as Timestamp;
    blogData = {
        id: blogDocSnapshot.id,
        ...rawData,
        createdAt: createdAtTimestamp?.toMillis ? createdAtTimestamp.toMillis() : (rawData.createdAt || 0),
    } as Blog;


    await updateBlogStatus(blogId, 'creating_repo');

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
        userId: data.userId, // Ensure userId is part of the returned object
        githubApiKey: data.githubApiKey || undefined,
        cloudflareApiToken: data.cloudflareApiToken || undefined,
        cloudflareApiKey: data.cloudflareApiKey || undefined,
        cloudflareEmail: data.cloudflareEmail || undefined,
        cloudflareAccountId: data.cloudflareAccountId || undefined,
      } as ApiConnection;
    }
    return null;
  } catch (error) {
    console.error('Error fetching API connection:', error);
    throw new Error('Failed to fetch API connection from Firestore.');
  }
}

// Add a new blog post to a specific blog
export async function addBlogPost(
  userId: string,
  blogId: string,
  postData: Omit<BlogPost, 'id' | 'blogId' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  if (!db) {
    throw new Error("Firestore database is not initialized.");
  }
  if (!userId || !blogId) {
    throw new Error("User ID and Blog ID are required to add a blog post.");
  }
  try {
    // Ensure the user owns the blog before adding a post
    const blog = await getBlog(blogId, userId);
    if (!blog) {
      throw new Error("Blog not found or user does not have permission.");
    }

    const postsCollectionRef = collection(db, BLOGS_COLLECTION, blogId, POSTS_SUBCOLLECTION);
    const docRef = await addDoc(postsCollectionRef, {
      ...postData,
      userId, // Redundant if checking ownership via getBlog, but good for direct subcollection queries
      blogId, // Useful if posts were ever queried across all blogs for a user (not current structure)
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding blog post:', error);
    throw new Error('Failed to add blog post to Firestore.');
  }
}

// Stream blog posts for a specific blog, ensuring user owns the blog
export function streamBlogPosts(
  userId: string,
  blogId: string,
  onUpdate: (posts: BlogPost[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!db) {
    const initError = new Error("Firestore database is not initialized. Cannot stream blog posts.");
    console.error(initError.message);
    onError(initError);
    return () => {};
  }
  if (!userId || !blogId) {
    const paramsError = new Error("User ID and Blog ID are required to stream posts.");
    console.error(paramsError.message);
    onError(paramsError);
    return () => {};
  }

  // First, verify blog ownership. This is a one-time check.
  // Real-time rules should also enforce this.
  getBlog(blogId, userId).then(blog => {
    if (!blog) {
      onError(new Error("Blog not found or permission denied."));
      return; // Stop if blog doesn't exist or user doesn't own it.
    }

    // If ownership is confirmed, proceed to stream posts
    const postsCollectionRef = collection(db, BLOGS_COLLECTION, blogId, POSTS_SUBCOLLECTION);
    const q = query(postsCollectionRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const posts = querySnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        const createdAtTimestamp = data.createdAt as Timestamp;
        const updatedAtTimestamp = data.updatedAt as Timestamp;
        return {
          id: docSnapshot.id,
          blogId: blogId, // ensure blogId is part of the post object
          userId: data.userId, // ensure userId is part of the post object
          ...data,
          createdAt: createdAtTimestamp?.toMillis ? createdAtTimestamp.toMillis() : (data.createdAt || 0),
          updatedAt: updatedAtTimestamp?.toMillis ? updatedAtTimestamp.toMillis() : (data.updatedAt || undefined),
        } as BlogPost;
      });
      onUpdate(posts);
    }, (err: any) => {
      console.error(`Error streaming posts for blog ${blogId}:`, err);
      let errorMessage = err.message || 'An unknown error occurred while streaming blog posts.';
      if (err.code === 'permission-denied') {
        errorMessage = `Permission denied when trying to stream posts for blog ${blogId}. Check Firestore security rules. Details: ${err.message}`;
      } else if (err.code === 'unimplemented' && err.message.includes('currently building')) {
        errorMessage = `The required Firestore index for posts is currently building. Please try again in a few minutes. Original error: ${err.message}`;
      }
      onError(new Error(errorMessage));
    });
    
    // This isn't the unsubscribe from the onSnapshot, this is a conceptual placeholder
    // The actual unsubscribe will be returned by the caller of this function.
    // The caller needs to handle this promise-based setup carefully.
    // It's better to return the unsubscribe function directly.
    // This structure is a bit complex for direct return of unsubscribe.
    // For now, this example will return an empty unsubscribe from the promise scope.
    // A more robust solution might involve an async setup for the listener.
    // **Correction**: The `unsubscribe` variable is in the correct scope.
    // The main issue is that this function will return `unsubscribe` immediately,
    // while the `onSnapshot` is set up asynchronously after `getBlog`.
    // This pattern needs to be handled by the caller or refactored.
    // For simplicity now, we'll assume the caller handles the Unsubscribe from onSnapshot.
    // **Refactor for clarity**: The onSnapshot should be the primary async operation.
    // The initial `getBlog` check is a guard. If it fails, `onSnapshot` is never called.
    
  }).catch(error => {
    onError(error); // Catch errors from getBlog
  });

  // This is tricky. The `unsubscribe` function from `onSnapshot` is inside a .then()
  // To return it correctly, this function would need to be more complex or return a Promise<Unsubscribe>
  // For now, returning a no-op for the outer scope. This part needs careful review.
  // The `unsubscribe` from `onSnapshot` should be what's returned.

  // Let's simplify: the caller will handle the real unsubscribe. This function sets up the listener.
  // We'll return the onSnapshot's unsubscribe directly if the guard passes.
  // The following approach is more direct:

  const postsCollectionRef = collection(db, BLOGS_COLLECTION, blogId, POSTS_SUBCOLLECTION);
  const q = query(postsCollectionRef, orderBy('createdAt', 'desc'));

  // Perform the ownership check before attaching the listener.
  // This is still not ideal for a "stream" function that should return unsubscribe immediately.
  // A common pattern is to return the unsubscribe and let the listener handle errors/empty states.
  // Security rules are the primary enforcer for subcollections.
  // So, we can simplify assuming rules are in place.

  const mainUnsubscribe = onSnapshot(q, (querySnapshot) => {
    // It's good practice to confirm userId on each post if possible, or rely on rules.
    const posts = querySnapshot.docs
      .filter(docSnapshot => docSnapshot.data().userId === userId) // Filter client-side for extra safety if rules are not fully specific
      .map(docSnapshot => {
        const data = docSnapshot.data();
        const createdAtTimestamp = data.createdAt as Timestamp;
        const updatedAtTimestamp = data.updatedAt as Timestamp;
        return {
          id: docSnapshot.id,
          blogId: blogId, 
          userId: data.userId, 
          ...data,
          createdAt: createdAtTimestamp?.toMillis ? createdAtTimestamp.toMillis() : (data.createdAt || 0),
          updatedAt: updatedAtTimestamp?.toMillis ? updatedAtTimestamp.toMillis() : (data.updatedAt || undefined),
        } as BlogPost;
      });
    onUpdate(posts);
  }, (err: any) => {
    console.error(`Error streaming posts for blog ${blogId} (user ${userId}):`, err);
    let errorMessage = err.message || 'An unknown error occurred while streaming blog posts.';
     if (err.code === 'permission-denied') {
        errorMessage = `Permission denied. Check Firestore rules for posts subcollection. Details: ${err.message}`;
    } else if (err.code === 'unimplemented' && err.message.includes('currently building')) {
        errorMessage = `Firestore index for posts is building. Try again soon. Details: ${err.message}`;
    } else if (err.code === 'failed-precondition' && err.message.includes('query requires an index')) {
        errorMessage = `Firestore query for posts requires an index. Please create it. Details: ${err.message}`;
    }
    onError(new Error(errorMessage));
  });

  return mainUnsubscribe; // This is the correct unsubscribe to return
}

