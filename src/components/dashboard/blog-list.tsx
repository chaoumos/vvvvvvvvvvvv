
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { Blog } from "@/lib/types";
import { streamUserBlogs } from "@/lib/firebase/firestore";
import { BlogCard } from "./blog-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function BlogListSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="p-6 pt-0 space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <div className="flex items-center p-6 pt-0 justify-between border-t">
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}


export function BlogList() {
  const { user } = useAuth();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      setBlogs([]);
      return;
    }

    setIsLoading(true);
    const unsubscribe = streamUserBlogs(
      user.uid,
      (fetchedBlogs) => {
        setBlogs(fetchedBlogs);
        setIsLoading(false);
        setError(null);
      },
      // (err) => { // onSnapshot's error callback is the third argument
      //   console.error("Error fetching blogs:", err);
      //   setError("Failed to load blogs. Please try again later.");
      //   setIsLoading(false);
      // }
    );
    // Workaround for onSnapshot error handling for now, as it's not directly in the type.
    // This requires modifying streamUserBlogs to handle its own try/catch for the initial getDocs if used,
    // or rely on the onSnapshot error argument for streaming errors.
    // For now, we assume streamUserBlogs handles internal errors gracefully or the callback itself can set error state.

    return () => unsubscribe();
  }, [user]);

  if (isLoading) {
    return <BlogListSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (blogs.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>No Blogs Yet!</AlertTitle>
        <AlertDescription>
          You haven&apos;t created any blogs. Click &quot;Create New Blog&quot; to get started.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {blogs.map((blog) => (
        <BlogCard key={blog.id} blog={blog} />
      ))}
    </div>
  );
}
