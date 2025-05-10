
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
import { useState } from "react";
import { createBlogAction, createBlogSchema, type CreateBlogFormValues } from "@/app/dashboard/create/actions";
import { useRouter } from "next/navigation";
import { predefinedThemes } from "@/lib/themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { AlertCircle, Eye, EyeOff, GitFork, Github, Globe, Info, Loader2, LockKeyhole, PencilLine, ScanText, StickyNote } from "lucide-react";
import { Alert, AlertTitle } from "../ui/alert";

export function CreateBlogForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [themeType, setThemeType] = useState<"predefined" | "custom">("predefined");
  const [showPat, setShowPat] = useState(false);

  const form = useForm<CreateBlogFormValues>({
    resolver: zodResolver(createBlogSchema),
    defaultValues: {
      siteName: "",
      blogTitle: "",
      description: "",
      themeType: "predefined",
      selectedPredefinedTheme: predefinedThemes[0]?.id || "",
      customThemeUrl: "",
      githubPat: "",
    },
  });

  async function onSubmit(values: CreateBlogFormValues) {
    if (!user) {
        toast({ title: "Authentication Error", description: "You must be logged in to create a blog.", variant: "destructive" });
        return;
    }
    setIsLoading(true);
    try {
      const result = await createBlogAction({ ...values, userId: user.uid });
      if (result.error) {
        toast({
          title: "Creation Failed",
          description: result.message || result.error,
          variant: "destructive",
        });
        if (result.issues) {
            // Optionally set form errors from server validation
            Object.entries(result.issues).forEach(([field, errors]) => {
                if (errors && errors.length > 0) {
                    form.setError(field as keyof CreateBlogFormValues, { message: errors[0] });
                }
            });
        }
      } else {
        toast({
          title: "Blog Creation Initiated!",
          description: "Your new blog is being set up. You'll be redirected shortly.",
        });
        router.push("/dashboard");
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

            <FormField
              control={form.control}
              name="githubPat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GitHub Personal Access Token (Optional)</FormLabel>
                   <div className="relative">
                    <LockKeyhole className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input 
                        type={showPat ? "text" : "password"}
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" 
                        {...field} 
                        className="pl-10 pr-10"
                      />
                    </FormControl>
                     <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 h-7 -translate-y-1/2 px-3"
                      onClick={() => setShowPat(!showPat)}
                    >
                      {showPat ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </Button>
                  </div>
                  <FormDescription>
                    Required for creating a new GitHub repository. Ensure it has `repo` scope. 
                    This token will be handled server-side and not stored long-term after initial use.
                  </FormDescription>
                   <Alert variant="default" className="mt-2 bg-yellow-50 border-yellow-300 text-yellow-700">
                      <AlertCircle className="h-4 w-4 !text-yellow-700" />
                      <AlertTitle className="font-semibold">Security Notice</AlertTitle>
                      <FormDescription className="!text-yellow-700">
                        Your PAT is sent to the server for repository creation and is not stored persistently by HugoHost after its initial use. However, always use tokens with the minimum required permissions and consider revoking them after use if you are concerned.
                      </FormDescription>
                    </Alert>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
