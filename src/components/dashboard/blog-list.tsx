
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
      setError(null); // Clear any previous error if user logs out/is not available
      return;
    }

    setIsLoading(true);
    setError(null); // Clear previous errors when re-fetching

    const unsubscribe = streamUserBlogs(
      user.uid,
      (fetchedBlogs) => { // onUpdate callback
        setBlogs(fetchedBlogs);
        setIsLoading(false);
        setError(null); // Clear error on successful data fetch
      },
      (err) => { // onError callback
        console.error("Error in BlogList from streamUserBlogs:", err);
        setError(`Failed to load blogs: ${err.message || "Please try again later."}`);
        setIsLoading(false);
        setBlogs([]); // Clear blogs on error to prevent showing stale data
      }
    );

    return () => unsubscribe(); // Cleanup subscription on component unmount
  }, [user]); // Re-run effect if user changes

  if (isLoading) {
    return <BlogListSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error Loading Blogs</AlertTitle>
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
