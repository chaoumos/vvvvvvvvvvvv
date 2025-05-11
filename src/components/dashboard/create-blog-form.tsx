
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type * as z from "zod";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { createBlogAction } from "@/app/dashboard/create/actions";
import { getApiConnectionsAction } from "@/app/dashboard/api-connections/actions";
import { createBlogSchema, type CreateBlogFormValues } from "@/app/dashboard/create/schema"; 
import { useRouter } from "next/navigation";
import { predefinedThemes } from "@/lib/themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link"; // Added import for Link
import { useAuth } from "@/hooks/use-auth";
import { AlertCircle, GitFork, Github, Loader2, PencilLine, ScanText } from "lucide-react";
import { Alert, AlertTitle, AlertDescription as ShadAlertDescription } from "@/components/ui/alert";

export function CreateBlogForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [themeType, setThemeType] = useState<"predefined" | "custom">("predefined");

  const form = useForm<CreateBlogFormValues>({
    resolver: zodResolver(createBlogSchema),
    defaultValues: {
      userId: user?.uid || "",
      siteName: "",
      blogTitle: "",
      description: "",
      themeType: "predefined",
      selectedPredefinedTheme: predefinedThemes[0]?.id || "",
      customThemeUrl: "",
    },
  });

  useEffect(() => {
    if (user) {
      form.setValue('userId', user.uid);
    }
  }, [user, form]);

  const onSubmit = async (values: CreateBlogFormValues) => {
    if (!user) {
        toast({ title: "Authentication Error", description: "You must be logged in to create a blog.", variant: "destructive" });
        return;
    }
    setIsLoading(true);
    // Fetch API connections before submission
    const apiConnectionsResult = await getApiConnectionsAction(user.uid);
    if (!apiConnectionsResult.success || !apiConnectionsResult.data?.githubApiKey) {
      toast({
        title: "Missing GitHub API Key",
        description: "Please add your GitHub API Key in the API Connections settings to create a repository.",
        variant: "destructive",
        duration: 5000,
      });
      setIsLoading(false); 
      router.push('/dashboard/api-connections'); // Redirect to API connections page
      return; 
    }

    try {
      const finalValues = { ...values, userId: user.uid }; 
      const result = await createBlogAction(finalValues);

      if (result.success && result.blogId) {
        toast({
          title: "Blog Creation Initiated!",
          description: result.message || `Your blog "${values.blogTitle}" is being set up. You'll be redirected shortly.`,
        });
        router.push("/dashboard");
      } else {
        toast({
          title: "Creation Failed",
          description: result.message || result.error || "An unknown error occurred during blog creation.",
          variant: "destructive",
        });
        if (result.issues) {
            Object.entries(result.issues).forEach(([field, errors]) => {
                if (errors && errors.length > 0) {
                    form.setError(field as keyof CreateBlogFormValues, { message: errors[0] });
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
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Blog Details</CardTitle>
        <CardDescription>Provide the necessary information to set up your Hugo blog.</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="default" className="mb-6 bg-blue-50 border-blue-200 text-blue-700">
          <AlertCircle className="h-5 w-5 !text-blue-700" />
          <AlertTitle className="font-semibold">Prerequisite: API Keys</AlertTitle>
          <ShadAlertDescription className="!text-blue-700">
            Ensure you have added your GitHub API Key in the <Link href="/dashboard/api-connections" className="font-medium underline hover:text-blue-800">API Connections</Link> page before creating a blog. This is required for automated repository creation. Cloudflare keys are needed for deployment (future feature).
          </ShadAlertDescription>
        </Alert>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="siteName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site Name</FormLabel>
                   <div className="relative">
                    <GitFork className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="my-awesome-blog" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormDescription>
                    Used for repository name and subdomain (e.g., my-awesome-blog). No spaces or special characters other than hyphens/underscores.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="blogTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Blog Title</FormLabel>
                  <div className="relative">
                    <PencilLine className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="My Awesome Blog Title" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormDescription>The main title displayed on your blog.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Blog Description</FormLabel>
                  <div className="relative">
                     <ScanText className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <FormControl>
                      <Textarea
                        placeholder="A short description for your blog (for SEO, max 160 characters)."
                        className="resize-none pl-10"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormDescription>A brief summary of your blog for search engines.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="themeType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Theme Selection</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        field.onChange(value);
                        setThemeType(value as "predefined" | "custom");
                      }}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1 md:flex-row md:space-y-0 md:space-x-4"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="predefined" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Choose from Predefined Themes
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="custom" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Use a Custom Theme (Git URL)
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {themeType === "predefined" && (
              <FormField
                control={form.control}
                name="selectedPredefinedTheme"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Predefined Theme</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a theme" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {predefinedThemes.map((theme) => (
                          <SelectItem key={theme.id} value={theme.id}>
                            <div className="flex items-center gap-3">
                              {theme.imageUrl && (
                                <Image
                                  src={theme.imageUrl}
                                  alt={theme.name}
                                  width={40}
                                  height={30}
                                  className="rounded object-cover"
                                  data-ai-hint={theme.dataAiHint || "theme preview"}
                                />
                              )}
                              <div>
                                <p className="font-semibold">{theme.name}</p>
                                {theme.description && <p className="text-xs text-muted-foreground line-clamp-1">{theme.description}</p>}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {themeType === "custom" && (
              <FormField
                control={form.control}
                name="customThemeUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Theme Git URL</FormLabel>
                     <div className="relative">
                        <Github className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <FormControl>
                        <Input placeholder="https://github.com/user/my-hugo-theme.git" {...field} className="pl-10"/>
                        </FormControl>
                    </div>
                    <FormDescription>
                      Enter the full Git URL for your custom Hugo theme.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Blog
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

