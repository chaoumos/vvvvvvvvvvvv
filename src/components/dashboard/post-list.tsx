
"use client";

import type { BlogPost } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText, Info, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "../ui/skeleton";

interface PostListProps {
  posts: BlogPost[];
  isLoading: boolean;
  error?: string | null;
}

function PostListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PostList({ posts, isLoading, error }: PostListProps) {
  if (isLoading) {
    return <PostListSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error Loading Posts</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (posts.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>No Posts Yet!</AlertTitle>
        <AlertDescription>
          This blog doesn&apos;t have any posts. Click &quot;Create New Post&quot; to add one.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <Card key={post.id} className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center">
              <FileText className="mr-2 h-5 w-5 text-primary" />
              {post.title}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Created: {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              {post.updatedAt && post.updatedAt !== post.createdAt && (
                <> | Updated: {formatDistanceToNow(new Date(post.updatedAt), { addSuffix: true })}</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {post.content.substring(0, 200)}{post.content.length > 200 ? "..." : ""}
            </p>
            {/* Add View/Edit buttons here later */}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
