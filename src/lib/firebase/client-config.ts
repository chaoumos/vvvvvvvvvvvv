
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

const ENV_VAR_MESSAGE_SUFFIX =
  'Please check your .env file and ensure it is correctly configured (refer to .env.example or README.md) and the development server has been restarted.';

if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
  firebaseInitializationError = `Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is missing or invalid. ${ENV_VAR_MESSAGE_SUFFIX}`;
} else if (!authDomain || typeof authDomain !== 'string' || authDomain.trim() === '') {
  firebaseInitializationError = `Firebase Auth Domain (NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) is missing or invalid. ${ENV_VAR_MESSAGE_SUFFIX}`;
} else if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
  firebaseInitializationError = `Firebase Project ID (NEXT_PUBLIC_FIREBASE_PROJECT_ID) is missing or invalid. ${ENV_VAR_MESSAGE_SUFFIX}`;
}
// Add similar checks for other essential variables if they are critical for app startup,
// e.g., storageBucket, messagingSenderId, appId if they are used immediately.

if (firebaseInitializationError) {
  console.warn(`Firebase Configuration Error: ${firebaseInitializationError}`);
  // app, auth, db will remain null and firebaseInitializationError will be exported.
} else {
  const firebaseConfig: FirebaseOptions = {
    apiKey, // These are now confirmed to be non-empty strings
    authDomain,
    projectId,
    storageBucket: storageBucket || undefined, // Use undefined if empty, as Firebase expects
    messagingSenderId: messagingSenderId || undefined,
    appId: appId || undefined,
  };

  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
    } catch (e: any) {
      console.error("Firebase SDK initialization error:", e);
      firebaseInitializationError = `Firebase SDK initialization failed: ${e.message}. This can be due to incorrect values in your .env file (even if present and seemingly correct), network issues, or other Firebase project setup problems (e.g., services not enabled, billing issues for certain features). Check console for details and ensure your Firebase project is correctly configured and the server restarted.`;
      app = null; // Ensure app is null if init fails
    }
  } else {
    app = getApp();
  }

  if (app) { // Check if app was successfully initialized or retrieved
    try {
      auth = getAuth(app);
      db = getFirestore(app);
    } catch (e: any) {
      console.error("Error getting Firebase Auth/Firestore instance:", e);
      // This error indicates a problem post-initialization or with getAuth/getFirestore itself.
      firebaseInitializationError = `Failed to get Firebase Auth/Firestore instance: ${e.message}. This usually indicates a problem with the initial app initialization or configuration.`;
      auth = null;
      db = null;
      // app = null; // Consider if app should also be nullified if critical services fail.
                   // For an auth-centric app, if auth fails, it's a critical failure.
    }
  } else if (!firebaseInitializationError) { 
    // This case handles if initializeApp itself returned null or was not set,
    // and no specific error was caught and set in firebaseInitializationError yet by previous checks.
    firebaseInitializationError = "Firebase app object is null after initialization attempt, but no specific error was caught. Please check Firebase configuration, .env values, and server logs.";
  }
}

export { app, auth, db, firebaseInitializationError };
