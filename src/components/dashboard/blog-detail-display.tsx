
"use client";

import type { Blog, BlogPost } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { getBlog, streamBlogPosts } from "@/lib/firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, AlertTriangle, Home, ExternalLink, Github } from "lucide-react";
import Link from "next/link";
import { PostList } from "./post-list";
import { Skeleton } from "../ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface BlogDetailDisplayProps {
  blogId: string;
}

function BlogDetailSkeleton() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3 mt-1" />
                </CardHeader>
                <CardContent className="flex justify-between items-center">
                    <Skeleton className="h-10 w-32" />
                     <div className="flex gap-2">
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-24" />
                    </div>
                </CardContent>
            </Card>
            <div>
                <Skeleton className="h-8 w-48 mb-4" /> {/* For "Posts" heading */}
                <PostList posts={[]} isLoading={true} />
            </div>
        </div>
    );
}


export function BlogDetailDisplay({ blogId }: BlogDetailDisplayProps) {
  const { user } = useAuth();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoadingBlog, setIsLoadingBlog] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [errorBlog, setErrorBlog] = useState<string | null>(null);
  const [errorPosts, setErrorPosts] = useState<string | null>(null);

  useEffect(() => {
    if (user && blogId) {
      setIsLoadingBlog(true);
      setErrorBlog(null);
      getBlog(blogId, user.uid)
        .then((fetchedBlog) => {
          if (fetchedBlog) {
            setBlog(fetchedBlog);
          } else {
            setErrorBlog("Blog not found or you do not have permission to view it.");
          }
        })
        .catch((err) => {
          console.error("Error fetching blog details:", err);
          setErrorBlog(err.message || "Failed to load blog details.");
        })
        .finally(() => setIsLoadingBlog(false));
    } else if (!user) {
        setErrorBlog("User not authenticated.");
        setIsLoadingBlog(false);
    }
  }, [user, blogId]);

  useEffect(() => {
    if (user && blogId && blog) { // Only stream posts if blog is loaded and user is authenticated
      setIsLoadingPosts(true);
      setErrorPosts(null);
      const unsubscribe = streamBlogPosts(
        user.uid, // Pass userId for ownership check within streamBlogPosts if implemented
        blogId,
        (fetchedPosts) => {
          setPosts(fetchedPosts);
          setIsLoadingPosts(false);
        },
        (err) => {
          console.error("Error streaming posts:", err);
          setErrorPosts(err.message || "Failed to load posts.");
          setIsLoadingPosts(false);
        }
      );
      return () => unsubscribe();
    } else {
        // If no blog or user, don't attempt to load posts
        setPosts([]);
        setIsLoadingPosts(false);
    }
  }, [user, blogId, blog]); // Depend on `blog` to ensure it's loaded first


  if (isLoadingBlog) {
    return <BlogDetailSkeleton />;
  }

  if (errorBlog) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Blog</AlertTitle>
        <AlertDescription>{errorBlog}</AlertDescription>
         <Button variant="outline" asChild className="mt-4">
            <Link href="/dashboard">
              <Home className="mr-2 h-4 w-4" /> Go to Dashboard
            </Link>
          </Button>
      </Alert>
    );
  }

  if (!blog) {
    // This case should ideally be covered by errorBlog, but as a fallback:
    return (
      <Alert variant="default" className="mt-4">
        <Info className="h-4 w-4" />
        <AlertTitle>Blog Not Found</AlertTitle>
        <AlertDescription>The requested blog could not be found.</AlertDescription>
         <Button variant="outline" asChild className="mt-4">
            <Link href="/dashboard">
              <Home className="mr-2 h-4 w-4" /> Go to Dashboard
            </Link>
          </Button>
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight">{blog.blogTitle}</CardTitle>
          <CardDescription className="text-md text-muted-foreground">{blog.description}</CardDescription>
          <p className="text-sm text-muted-foreground">Site Name: {blog.siteName} | Theme: {blog.theme.name}</p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 items-center">
           {blog.githubRepoUrl && (
            <Button variant="outline" size="sm" asChild>
              <Link href={blog.githubRepoUrl} target="_blank" rel="noopener noreferrer">
                <Github className="mr-1.5 h-4 w-4" /> View on GitHub
              </Link>
            </Button>
          )}
          {blog.liveUrl && blog.status === 'live' && (
            <Button variant="default" size="sm" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href={blog.liveUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" /> Visit Live Site
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <div>
        <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <h2 className="text-2xl font-semibold">Manage Posts</h2>
            <Link href={`/dashboard/blog/${blogId}/new-post`} passHref>
                <Button>
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Create New Post
                </Button>
            </Link>
        </div>
        <PostList posts={posts} isLoading={isLoadingPosts} error={errorPosts} />
      </div>
    </div>
  );
}
