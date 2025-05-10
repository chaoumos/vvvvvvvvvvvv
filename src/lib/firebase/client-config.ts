import { initializeApp, getApps, getApp, type FirebaseOptions, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let firebaseInitializationError: string | null = null;

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
  firebaseInitializationError = 'Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is missing or invalid.';
} else if (!authDomain || typeof authDomain !== 'string' || authDomain.trim() === '') {
  firebaseInitializationError = 'Firebase Auth Domain (NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) is missing or invalid.';
} else if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
  firebaseInitializationError = 'Firebase Project ID (NEXT_PUBLIC_FIREBASE_PROJECT_ID) is missing or invalid.';
}

if (firebaseInitializationError) {
  console.warn(`Firebase Configuration Error: ${firebaseInitializationError} Please update your .env file, ensure it's correctly named and populated (refer to .env.example), and restart the development server.`);
} else {
  const firebaseConfig: FirebaseOptions = {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  };

  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
    } catch (e: any) {
      console.error("Firebase SDK initialization error:", e);
      firebaseInitializationError = `Firebase SDK initialization failed: ${e.message}. This can be due to incorrect values in your .env file (even if present) or other Firebase project setup issues. Check console for details and ensure server restarted.`;
      app = null; 
    }
  } else {
    app = getApp();
  }

  if (app) {
    try {
      auth = getAuth(app);
      db = getFirestore(app);
    } catch (e: any) {
      console.error("Error getting Firebase Auth/Firestore instance:", e);
      firebaseInitializationError = `Failed to get Firebase Auth/Firestore instance: ${e.message}. This usually indicates a problem with the initial app initialization.`;
      auth = null;
      db = null;
      app = null; // also nullify app if auth/db can't be retrieved
    }
  } else if (!firebaseInitializationError) { 
      // This case should ideally not be reached if initializeApp succeeded or failed with an error
      firebaseInitializationError = "Firebase app object is null after initialization attempt, but no specific error was caught. Please check Firebase configuration and server logs.";
  }
}

export { app, auth, db, firebaseInitializationError };
