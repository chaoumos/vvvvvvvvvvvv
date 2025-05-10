"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function HomePage() {
  const { user, loading } = useAuth(); // loading here reflects AuthProvider's loading state
  const router = useRouter();

  useEffect(() => {
    // Only attempt redirection if AuthProvider is done loading AND there was no init error.
    // AuthProvider handles the initError display, so this component shouldn't redirect if that's the case.
    // `loading` from `useAuth` will become false even if there's an init error.
    // The `user` will be null if there's an init error or if not logged in.
    if (!loading) {
      // If AuthProvider is displaying an error, user might be null.
      // The redirect logic in AuthProvider itself should handle cases where initError is present.
      // This page's logic is for when Firebase is correctly initialized.
      if (auth.currentUser === null && firebaseInitializationError !== null) {
          // This condition implies an initialization error might have occurred
          // but AuthProvider might not have rendered its error message yet,
          // or this page is rendering somehow. Defer to AuthProvider's logic.
          // However, if AuthProvider is showing error, this component's UI won't be shown.
          // This check is mostly defensive.
          return;
      }
      
      if (user) {
        router.replace('/dashboard');
      } else {
        // This will execute if user is null and no critical init error stopped AuthProvider.
        // AuthProvider's own redirect logic might also cover this.
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  // This spinner will show if AuthProvider is loading, or if AuthProvider has finished
  // loading but this page's redirect logic hasn't completed yet.
  // If AuthProvider shows an init error, this component's UI (including this spinner)
  // will not be rendered as children of AuthProvider.
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <LoadingSpinner className="h-12 w-12 text-primary" />
    </div>
  );
}

// Need to import auth and firebaseInitializationError to check them in useEffect.
// This might be an anti-pattern as HomePage should ideally not know about firebaseInitializationError.
// AuthProvider should be the single source of truth for this.
// Let's simplify HomePage assuming AuthProvider correctly gates rendering.

import { auth, firebaseInitializationError } from '@/lib/firebase/client-config'; // Added for the check above, reconsidering.

// Simpler version of HomePage:
// useEffect(() => {
//   if (!loading) { // loading is from AuthProvider
//     if (user) {
//       router.replace('/dashboard');
//     } else {
//       // If user is null, it could be due to not being logged in,
//       // or an init error where AuthProvider would show an error screen.
//       // If no init error, redirect to login.
//       if (firebaseInitializationError === null) { // Check this to avoid redirect loop if init error shown by AuthProvider
//         router.replace('/login');
//       }
//     }
//   }
// }, [user, loading, router]);
// The above logic for page.tsx combined with AuthProvider's redirect seems fine.
// The key is that if initError is present in AuthProvider, it won't render children.
// If initError is null, then standard auth loading/redirect logic applies.
