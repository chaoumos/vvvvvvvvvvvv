import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
  throw new Error(
    'Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is missing or invalid. ' +
    'Please check your .env file and ensure it is correctly configured and the development server has been restarted.'
  );
}

if (!authDomain || typeof authDomain !== 'string' || authDomain.trim() === '') {
  throw new Error(
    'Firebase Auth Domain (NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) is missing or invalid. ' +
    'Please check your .env file and ensure it is correctly configured and the development server has been restarted.'
  );
}

if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
  throw new Error(
    'Firebase Project ID (NEXT_PUBLIC_FIREBASE_PROJECT_ID) is missing or invalid. ' +
    'Please check your .env file and ensure it is correctly configured and the development server has been restarted.'
  );
}

// Other variables like storageBucket, messagingSenderId, appId can be optional
// depending on the Firebase services used. If they are essential for your app, add checks for them too.
// For this app, they are not strictly required for the initial auth/firestore setup to proceed,
// but might be needed for specific features. Firebase will throw errors if they are needed and missing/invalid.

const firebaseConfig: FirebaseOptions = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
};

let app;
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (error: any) {
    // Log the config without sensitive details for easier debugging
    const safeConfigForLogging = {
      apiKey: apiKey ? 'present (hidden for security)' : 'MISSING or INVALID',
      authDomain: authDomain || 'MISSING or INVALID',
      projectId: projectId || 'MISSING or INVALID',
      storageBucket: storageBucket || 'Not set or MISSING',
      messagingSenderId: messagingSenderId || 'Not set or MISSING',
      appId: appId || 'Not set or MISSING',
    };
    console.error("Firebase initialization error. Config used (apiKey is masked):", safeConfigForLogging);
    throw new Error(
      `Firebase initialization failed: ${error.message}. ` +
      'Please verify your Firebase configuration in the .env file and ensure the development server has been restarted. ' +
      'Also, confirm that the Firebase project settings (API key, Auth Domain, Project ID, etc.) are correct in the Firebase console and match your .env file.'
    );
  }
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
