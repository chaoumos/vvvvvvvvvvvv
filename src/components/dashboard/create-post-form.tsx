
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { createPostAction } from "@/app/dashboard/blog/[blogId]/new-post/actions";
import { createPostSchema, type CreatePostFormValues } from "@/app/dashboard/blog/[blogId]/new-post/schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FilePlus, Type, BookText } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

interface CreatePostFormProps {
  blogId: string;
}

export function CreatePostForm({ blogId }: CreatePostFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CreatePostFormValues>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  async function onSubmit(values: CreatePostFormValues) {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    if (!blogId) {
      toast({ title: "Error", description: "Blog ID is missing.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const result = await createPostAction(user.uid, blogId, values);
      if (result.success && result.postId) {
        toast({
          title: "Post Created!",
          description: `Your new post "${values.title}" has been saved.`,
        });
        router.push(`/dashboard/blog/${blogId}`); // Redirect to the blog detail page
      } else {
        toast({
          title: "Creation Failed",
          description: result.error || "An unknown error occurred.",
          variant: "destructive",
        });
        if (result.issues) {
          Object.entries(result.issues).forEach(([field, errors]) => {
            if (errors && errors.length > 0) {
              form.setError(field as keyof CreatePostFormValues, { message: errors[0] });
            }
          });
        }
      }
    } catch (error) {
      toast({
        title: "An Unexpected Error Occurred",
        description: (error as Error).message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center">
          <FilePlus className="mr-3 h-7 w-7 text-primary" /> Create New Blog Post
        </CardTitle>
        <CardDescription>Fill in the details for your new post. Content should be in Markdown format.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Type className="mr-2 h-5 w-5"/>Post Title</FormLabel>
                  <FormControl>
                    <Input placeholder="My Awesome Post Title" {...field} />
                  </FormControl>
                  <FormDescription>The main title of your blog post.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><BookText className="mr-2 h-5 w-5"/>Post Content (Markdown)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write your post content here using Markdown... \n\n# Heading 1\n\nSome **bold** text and some *italic* text."
                      className="resize-y min-h-[250px] font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Use Markdown for formatting. You can include headings, lists, links, images, etc.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-3">
                 <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="min-w-[120px]">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePlus className="mr-2 h-4 w-4" />}
                    Create Post
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
       <CardFooter>
        <p className="text-xs text-muted-foreground">
          Posts are saved to Firestore. To publish them to your Hugo site, further integration with GitHub is required.
        </p>
      </CardFooter>
    </Card>
  );
}
