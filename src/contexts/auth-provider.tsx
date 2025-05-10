
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth as firebaseAuthInstance, firebaseInitializationError } from '@/lib/firebase/client-config';
import type { UserProfile } from '@/lib/types';
import { usePathname, useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AlertTriangle } from 'lucide-react';

export interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const AUTH_ROUTES = ['/login', '/signup'];
const DASHBOARD_ROOT = '/dashboard';

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // Use the imported firebaseInitializationError to set the initial state of initError
  const [initError, setInitError] = useState<string | null>(firebaseInitializationError);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If there's an initialization error, or if firebaseAuthInstance is null (which it would be if initError is set from client-config),
    // then we don't proceed with onAuthStateChanged.
    if (initError || !firebaseAuthInstance) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, (fbUser) => {
      setUser(fbUser as UserProfile); // Cast FirebaseUser to UserProfile
      setLoading(false);
    });
    return () => unsubscribe();
  }, [initError, firebaseAuthInstance]); // firebaseAuthInstance is stable, initError is the key for re-evaluation

  useEffect(() => {
    if (initError || loading) return; // Don't redirect if there's an init error or still loading

    const isAuthRoute = AUTH_ROUTES.includes(pathname);
    // Protected routes are dashboard and the root page (which should redirect)
    const isProtectedRoute = pathname.startsWith(DASHBOARD_ROOT) || pathname === '/';

    if (!user && isProtectedRoute && !isAuthRoute) {
      router.replace('/login');
    } else if (user && isAuthRoute) {
      router.replace(DASHBOARD_ROOT);
    } else if (pathname === '/') { 
      if (user) {
        router.replace(DASHBOARD_ROOT);
      } else {
        // If no user and on root, and no initError, implies we should go to login
        router.replace('/login');
      }
    }
  }, [user, loading, router, pathname, initError]);

  const logout = async () => {
    if (firebaseAuthInstance) {
      await firebaseAuthInstance.signOut();
    }
    setUser(null);
    // No need to setLoading(true) here, as onAuthStateChanged will trigger if user becomes null
    // However, to ensure immediate UI update for logged out state:
    setLoading(false); 
    router.push('/login');
  };
  
  if (initError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <AlertTriangle className="mb-4 h-16 w-16 text-destructive" />
        <h1 className="mb-3 text-3xl font-bold text-destructive">Application Configuration Error</h1>
        <p className="mb-2 text-lg text-foreground">{initError}</p>
        <p className="text-md text-muted-foreground">
          Please ensure your Firebase environment variables (e.g., <code>NEXT_PUBLIC_FIREBASE_API_KEY</code>) are correctly set up in your <code>.env</code> file.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-left text-sm text-muted-foreground sm:text-base">
          <li>Verify that you have a <code>.env</code> file in the root of your project.</li>
          <li>If not, copy <code>.env.example</code> to <code>.env</code>.</li>
          <li>Fill in the placeholder values in <code>.env</code> with your actual Firebase project credentials.</li>
          <li>Make sure the variable names start with <code>NEXT_PUBLIC_</code>.</li>
          <li>Restart your development server (e.g., <code>npm run dev</code> or <code>yarn dev</code>) after creating or modifying the <code>.env</code> file.</li>
          <li>Refer to the <code>README.md</code> for detailed setup instructions.</li>
        </ul>
      </div>
    );
  }

  // Show loading spinner for auth routes, dashboard, or root page while auth state is being determined
  // and no initialization error has occurred.
  if (loading && (pathname.startsWith(DASHBOARD_ROOT) || AUTH_ROUTES.includes(pathname) || pathname === '/')) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
