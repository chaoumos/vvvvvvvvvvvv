
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
} from 'firebase/firestore';
import { db } from './client-config';
import type { Blog, BlogStatus, SelectedTheme } from '../types';

const BLOGS_COLLECTION = 'blogs';

// Add a new blog
export async function addBlog(userId: string, blogData: Omit<Blog, 'id' | 'userId' | 'createdAt' | 'status'>): Promise<string> {
  try {
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
        // Convert Firestore Timestamp to milliseconds for consistency with Blog type
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
        // Convert Firestore Timestamp to milliseconds
        createdAt: createdAtTimestamp?.toMillis ? createdAtTimestamp.toMillis() : (data.createdAt || 0),
      } as Blog;
    });
    onUpdate(blogs);
  }, (err) => { // Firebase onSnapshot error callback
    console.error("Error streaming user blogs from Firestore:", err);
    // Pass a standard Error object to the onError callback
    onError(new Error(err.message || 'An unknown error occurred while streaming blogs.'));
  });

  return unsubscribe;
}


// Update blog status
export async function updateBlogStatus(blogId: string, status: BlogStatus, details?: Partial<Pick<Blog, 'githubRepoUrl' | 'liveUrl' | 'error'>>): Promise<void> {
  try {
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
    const blogRef = doc(db, BLOGS_COLLECTION, blogId);
    await deleteDoc(blogRef);
  } catch (error) {
    console.error('Error deleting blog:', error);
    throw new Error('Failed to delete blog.');
  }
}

/**
 * Handles the actual backend processing for blog creation, including GitHub repo creation.
 * In a real app, this would ideally be triggered by a Cloud Function or similar server-side process
 * reacting to the Firestore 'pending' status, to securely handle the PAT.
 * For demonstration purposes, this is implemented here.
 */
export async function simulateBlogCreationProcess(blogId: string, siteName: string): Promise<void> {
  try {
    await updateBlogStatus(blogId, 'creating_repo'); // Update status to reflect repo creation attempt

    // Retrieve blog data to get the PAT
    // Note: Querying by '__name__' is less efficient. If possible, get the full doc directly if you have path.
    // However, for this simulation structure, this query is used.
    const blogCollectionRef = collection(db, BLOGS_COLLECTION);
    const blogDocumentRef = doc(blogCollectionRef, blogId);
    
    // To get the document, you'd typically use getDoc if you have the ref.
    // The existing code uses a query, which is unusual for fetching a single doc by ID.
    // Let's adjust to a more standard getDoc if possible, or keep if structure demands.
    // For now, will keep the query to match existing, but it's a point of potential optimization.
    const blogQuery = query(collection(db, BLOGS_COLLECTION), where('__name__', '==', blogId));
    const blogDocSnapshot = await getDocs(blogQuery);

    if (blogDocSnapshot.empty) {
      throw new Error(`Blog with ID ${blogId} not found.`);
    }
    const blogData = blogDocSnapshot.docs[0].data() as Blog;
    const githubPat = blogData.pat;

    if (!githubPat) {
        await updateBlogStatus(blogId, 'failed', { error: 'GitHub Personal Access Token is missing. Cannot create repository.' });
        return;
    }

    // Call GitHub API to create a repository
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

    const responseBody = await response.json(); // Read body once

    if (response.ok) { // Check response.ok (status 200-299)
      const githubRepoUrl = responseBody.html_url;
      await updateBlogStatus(blogId, 'live', { githubRepoUrl, liveUrl: 'Deployment setup pending...' });
    } else {
      console.error('GitHub API Error:', responseBody);
      const errorMessage = responseBody.message || `Failed to create GitHub repository (Status: ${response.status})`;
      await updateBlogStatus(blogId, 'failed', { error: `GitHub API Error: ${errorMessage}` });
    }

  } catch (error: any) {
    console.error("Error in blog creation simulation:", error);
    await updateBlogStatus(blogId, 'failed', { error: `Simulation process failed: ${error.message || 'Unknown error'}` });
  }
}

