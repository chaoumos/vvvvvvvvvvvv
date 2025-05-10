
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/client-config';
import type { UserProfile } from '@/lib/types';
import { usePathname, useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

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
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser as UserProfile);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    const isAuthRoute = AUTH_ROUTES.includes(pathname);
    const isProtectedRoute = pathname.startsWith(DASHBOARD_ROOT) || pathname === '/';


    if (!user && isProtectedRoute && !isAuthRoute && pathname !== '/') {
      router.push('/login');
    } else if (user && isAuthRoute) {
      router.push(DASHBOARD_ROOT);
    } else if (user && pathname === '/') {
       router.push(DASHBOARD_ROOT);
    } else if (!user && pathname === '/') {
        router.push('/login');
    }

  }, [user, loading, router, pathname]);


  const logout = async () => {
    await auth.signOut();
    setUser(null);
    router.push('/login');
  };
  
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
