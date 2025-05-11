
"use client";

import type { Blog, BlogStatus } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Github, ExternalLink, AlertTriangle, RefreshCw, Trash2, Copy, Settings, Info } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { deleteBlog, simulateBlogCreationProcess } from "@/lib/firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { formatDistanceToNow } from 'date-fns';


interface BlogCardProps {
  blog: Blog;
}

const statusStyles: Record<BlogStatus, string> = {
  pending: "bg-yellow-400/20 text-yellow-600 border-yellow-400",
  creating_repo: "bg-blue-400/20 text-blue-600 border-blue-400 animate-pulse",
  configuring_theme: "bg-indigo-400/20 text-indigo-600 border-indigo-400 animate-pulse",
  generating_config: "bg-purple-400/20 text-purple-600 border-purple-400 animate-pulse",
  deploying: "bg-cyan-400/20 text-cyan-600 border-cyan-400 animate-pulse",
  live: "bg-green-400/20 text-green-600 border-green-400",
  failed: "bg-red-400/20 text-red-600 border-red-400",
};

const statusDisplayNames: Record<BlogStatus, string> = {
  pending: "Pending",
  creating_repo: "Creating Repo",
  configuring_theme: "Configuring Theme",
  generating_config: "Generating Config",
  deploying: "Deploying",
  live: "Live",
  failed: "Failed",
};

export function BlogCard({ blog }: BlogCardProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteBlog(blog.id);
      toast({ title: "Blog Deleted", description: `"${blog.blogTitle}" has been removed.` });
    } catch (error) {
      toast({ title: "Error Deleting Blog", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRetry = async () => {
    if (!blog.userId || !blog.id) return;
    setIsRetrying(true);
    try {
      await simulateBlogCreationProcess(blog.id, blog.siteName);
      toast({ title: "Retrying Creation", description: `Process restarted for "${blog.blogTitle}".` });
    } catch (error) {
      toast({ title: "Retry Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsRetrying(false);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied to Clipboard", description: `${fieldName} copied!` });
    }).catch(err => {
      toast({ title: "Copy Failed", description: `Could not copy ${fieldName}.`, variant: "destructive" });
    });
  };

  return (
    <Card className="flex flex-col justify-between h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl font-semibold">{blog.blogTitle}</CardTitle>
          <Badge className={cn("text-xs", statusStyles[blog.status])}>
            {statusDisplayNames[blog.status]}
          </Badge>
        </div>
        <CardDescription className="text-sm text-muted-foreground line-clamp-2">{blog.description}</CardDescription>
        <p className="text-xs text-muted-foreground pt-1">
          Created: {blog.createdAt ? formatDistanceToNow(new Date(blog.createdAt), { addSuffix: true }) : 'N/A'}
        </p>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="space-y-2 text-sm">
          <p><strong className="font-medium">Site Name:</strong> {blog.siteName}</p>
          <p><strong className="font-medium">Theme:</strong> {blog.theme.name} ({blog.theme.isCustom ? "Custom" : "Predefined"})</p>
          {blog.theme.isCustom && blog.theme.gitUrl && (
             <div className="flex items-center">
              <strong className="font-medium mr-1">Theme URL:</strong> 
              <a href={blog.theme.gitUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[150px] sm:max-w-[200px]">
                {blog.theme.gitUrl}
              </a>
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => copyToClipboard(blog.theme.gitUrl, "Theme URL")}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
          {blog.deploymentNote && (
            <p className="mt-2 text-xs text-muted-foreground border-l-2 border-primary/50 dark:border-primary/70 pl-2 py-1 italic rounded-r-sm bg-muted/30">
              <Info className="inline h-3.5 w-3.5 mr-1.5 relative -top-px text-primary/80" />
              {blog.deploymentNote}
            </p>
          )}
          {blog.status === 'failed' && blog.error && (
            <div className="mt-2 p-2 rounded-md bg-destructive/10 text-destructive text-xs flex items-start">
              <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
              <span><strong>Error:</strong> {blog.error}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-between items-center pt-4 border-t gap-2">
        <div className="flex gap-2"> {/* Left-aligned external links */}
          {blog.githubRepoUrl && (
            <Button variant="outline" size="sm" asChild>
              <Link href={blog.githubRepoUrl} target="_blank" rel="noopener noreferrer">
                <Github className="mr-1.5 h-4 w-4" /> GitHub
              </Link>
            </Button>
          )}
          {blog.liveUrl && blog.status === 'live' && (
            <Button variant="default" size="sm" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href={blog.liveUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" /> Visit Site
              </Link>
            </Button>
          )}
        </div>
        <div className="flex gap-2"> {/* Right-aligned action buttons */}
           <Link href={`/dashboard/blog/${blog.id}`} passHref>
            <Button variant="outline" size="sm">
              <Settings className="mr-1.5 h-4 w-4" /> Manage
            </Button>
          </Link>
          {blog.status === 'failed' && (
            <Button variant="outline" size="sm" onClick={handleRetry} disabled={isRetrying}>
              {isRetrying ? <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
              Retry
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isDeleting}>
                {isDeleting ? <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the blog record for &quot;{blog.blogTitle}&quot;.
                  It will not delete the GitHub repository or the deployed site.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className={cn(buttonVariants({variant: "destructive"}))} disabled={isDeleting}>
                  {isDeleting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Yes, delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
}

