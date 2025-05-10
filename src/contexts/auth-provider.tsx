"use client";

import type { ReactNode } from 'react';
import React, { createContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth, firebaseInitializationError } from '@/lib/firebase/client-config';
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
  const [initError, setInitError] = useState<string | null>(firebaseInitializationError);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (initError || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser as UserProfile);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [initError, auth]);

  useEffect(() => {
    if (initError || loading) return;

    const isAuthRoute = AUTH_ROUTES.includes(pathname);
    const isProtectedRoute = pathname.startsWith(DASHBOARD_ROOT) || pathname === '/';

    if (!user && isProtectedRoute && !isAuthRoute) {
      router.push('/login');
    } else if (user && isAuthRoute) {
      router.push(DASHBOARD_ROOT);
    } else if (pathname === '/') { // Explicitly handle root path after loading and initError check
      if (user) {
        router.push(DASHBOARD_ROOT);
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router, pathname, initError]);

  const logout = async () => {
    if (auth) {
      await auth.signOut();
    }
    setUser(null);
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
          Please ensure your Firebase environment variables (e.g., <code>NEXT_PUBLIC_FIREBASE_API_KEY</code>) are correctly set up.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-left text-sm text-muted-foreground sm:text-base">
          <li>Verify that you have a <code>.env</code> file in the root of your project.</li>
          <li>Copy variables from <code>.env.example</code> to your <code>.env</code> file.</li>
          <li>Fill in the placeholder values in <code>.env</code> with your actual Firebase project credentials.</li>
          <li>Restart your development server (e.g., <code>npm run dev</code> or <code>yarn dev</code>) after creating or modifying the <code>.env</code> file.</li>
        </ul>
      </div>
    );
  }

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
