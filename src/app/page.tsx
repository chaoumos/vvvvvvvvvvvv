"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // AuthProvider handles the primary redirection logic for the root path ('/'),
    // including cases related to initialization errors, loading state, and user authentication status.
    // This useEffect serves as a secondary check or handles navigation if the user somehow lands
    // on '/' after the initial load sequence handled by AuthProvider.
    if (!loading) {
      // If AuthProvider determined an initialization error, it would render an error message
      // instead of this component's children. So, if this code runs, initError was null.
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  // This spinner is shown while AuthProvider is in its initial loading phase,
  // or if this page is rendered transiently before AuthProvider's redirection takes full effect.
  // If AuthProvider encounters an initialization error, it displays an error message,
  // and this component (as a child) would not be rendered.
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <LoadingSpinner className="h-12 w-12 text-primary" />
    </div>
  );
}
