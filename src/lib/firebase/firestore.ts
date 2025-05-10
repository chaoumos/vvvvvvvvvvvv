
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
    const q = query(
      collection(db, BLOGS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Blog));
  } catch (error) {
    console.error('Error fetching user blogs:', error);
    throw new Error('Failed to fetch user blogs.');
  }
}

// Stream user blogs
export function streamUserBlogs(userId: string, callback: (blogs: Blog[]) => void): Unsubscribe {
  const q = query(
    collection(db, BLOGS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const blogs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Blog));
    callback(blogs);
  }, (error) => {
    console.error("Error streaming user blogs:", error);
    // You might want to propagate this error to the UI
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

// Simulate backend processing for blog creation
// In a real app, this would be replaced by Cloud Function triggers or calls.
export async function simulateBlogCreationProcess(blogId: string, siteName: string) {
  const randomDelay = (min = 1000, max = 3000) => new Promise(res => setTimeout(res, Math.random() * (max - min) + min));

  try {
    await updateBlogStatus(blogId, 'creating_repo');
    await randomDelay();
    const githubRepoUrl = `https://github.com/user/${siteName}`; // Placeholder
    await updateBlogStatus(blogId, 'configuring_theme', { githubRepoUrl });
    await randomDelay();
    await updateBlogStatus(blogId, 'deploying');
    await randomDelay(3000, 6000); // Longer delay for deployment
    
    // Simulate a chance of failure
    if (Math.random() < 0.1) { // 10% chance of failure
        await updateBlogStatus(blogId, 'failed', { error: 'Simulated deployment failure.'});
    } else {
        const liveUrl = `https://${siteName.toLowerCase().replace(/\s+/g, '-')}.example.dev`; // Placeholder
        await updateBlogStatus(blogId, 'live', { liveUrl });
    }

  } catch (error) {
    console.error("Error in simulation:", error);
    await updateBlogStatus(blogId, 'failed', { error: 'Simulation process failed.' });
  }
}
