
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { ApiConnectionsFormValues } from "@/app/dashboard/api-connections/schema";
import { apiConnectionsSchema } from "@/app/dashboard/api-connections/schema";
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
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getApiConnectionsAction, saveApiConnectionsAction } from "@/app/dashboard/api-connections/actions";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, Cloud, KeyRound, UserCircle, Mail, Eye, EyeOff, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription as ShadAlertDescription } from "@/components/ui/alert";


export function ApiConnectionsForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const [showGitHubApiKey, setShowGitHubApiKey] = useState(false);
  const [showCloudflareApiToken, setShowCloudflareApiToken] = useState(false);
  const [showCloudflareApiKey, setShowCloudflareApiKey] = useState(false);

  const form = useForm<ApiConnectionsFormValues>({
    resolver: zodResolver(apiConnectionsSchema),
    defaultValues: {
      githubApiKey: "",
      cloudflareApiToken: "",
      cloudflareApiKey: "",
      cloudflareEmail: "",
      cloudflareAccountId: "",
    },
  });

  useEffect(() => {
    if (user?.uid) {
      setIsFetching(true);
      getApiConnectionsAction(user.uid)
        .then(result => {
          if (result.success && result.data) {
            form.reset({
              githubApiKey: result.data.githubApiKey || "",
              cloudflareApiToken: result.data.cloudflareApiToken || "",
              cloudflareApiKey: result.data.cloudflareApiKey || "",
              cloudflareEmail: result.data.cloudflareEmail || "",
              cloudflareAccountId: result.data.cloudflareAccountId || "",
            });
          } else if (result.error) {
            toast({ title: "Error", description: result.error, variant: "destructive" });
          }
        })
        .catch(err => {
          toast({ title: "Error", description: "Could not load API connections.", variant: "destructive" });
          console.error("Error fetching API connections for form:", err);
        })
        .finally(() => setIsFetching(false));
    }
  }, [user, form, toast]);

  async function onSubmit(values: ApiConnectionsFormValues) {
    if (!user?.uid) {
      toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const result = await saveApiConnectionsAction(user.uid, values);
      if (result.success) {
        toast({ title: "Success", description: result.message });
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        if (result.issues) {
            Object.entries(result.issues).forEach(([field, errors]) => {
                if (errors && errors.length > 0) {
                    form.setError(field as keyof ApiConnectionsFormValues, { message: errors[0] });
                }
            });
        }
      }
    } catch (error) {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  if (isFetching) {
    return (
        <div className="flex justify-center items-center p-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Manage API Keys</CardTitle>
        <CardDescription>
          Store your API keys securely. These keys are used to interact with third-party services like GitHub and Cloudflare on your behalf.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="default" className="mb-6 bg-blue-50 border-blue-200 text-blue-700">
            <ShieldCheck className="h-5 w-5 !text-blue-700" />
            <AlertTitle className="font-semibold">Security Note</AlertTitle>
            <ShadAlertDescription className="!text-blue-700">
            Your API keys are stored encrypted (at rest, by Firestore) and are only used for actions you initiate through this dashboard.
            Never share your API keys. Use keys with the minimum required permissions.
            </ShadAlertDescription>
        </Alert>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <section className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center border-b pb-2 mb-4">
                <Github className="mr-3 h-6 w-6 text-primary" /> GitHub
              </h2>
              {/* GitHub API Key */}
              <FormField
                control={form.control}
                name="githubApiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><KeyRound className="mr-2 h-5 w-5" /> GitHub API Key</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showGitHubApiKey ? "text" : "password"}
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                          {...field}
                          className="pr-10"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 h-7 -translate-y-1/2 px-3"
                        onClick={() => setShowGitHubApiKey(!showGitHubApiKey)}
                        aria-label={showGitHubApiKey ? "Hide GitHub API Key" : "Show GitHub API Key"}
                      >
                        {showGitHubApiKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </Button>
                    </div>
                    <FormDescription>Your GitHub Personal Access Token (PAT) with `repo` scope for repository operations.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            <hr className="my-8" />

            <section className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center border-b pb-2 mb-4">
                <Cloud className="mr-3 h-6 w-6 text-orange-500" /> Cloudflare
              </h2>
              
              {/* Cloudflare API Token */}
              <FormField
                control={form.control}
                name="cloudflareApiToken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><KeyRound className="mr-2 h-5 w-5" /> Cloudflare API Token (Recommended)</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showCloudflareApiToken ? "text" : "password"}
                          placeholder="Cloudflare API Token"
                          {...field}
                          className="pr-10"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 h-7 -translate-y-1/2 px-3"
                        onClick={() => setShowCloudflareApiToken(!showCloudflareApiToken)}
                        aria-label={showCloudflareApiToken ? "Hide Cloudflare API Token" : "Show Cloudflare API Token"}
                      >
                        {showCloudflareApiToken ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </Button>
                    </div>
                    <FormDescription>
                      Create an API Token with permissions for DNS (Zone.Zone, Zone.DNS) and Pages (Account.Pages). 
                      <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">Create Token</a>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Cloudflare Account ID */}
              <FormField
                control={form.control}
                name="cloudflareAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><UserCircle className="mr-2 h-5 w-5" /> Cloudflare Account ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Cloudflare Account ID" {...field} />
                    </FormControl>
                    <FormDescription>Find this on the right sidebar of your Cloudflare dashboard homepage.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Alert variant="default" className="mt-4 bg-yellow-50 border-yellow-300 text-yellow-700">
                  <AlertTriangle className="h-4 w-4 !text-yellow-700" />
                  <AlertTitle className="font-semibold">Legacy Cloudflare API Key (Less Secure)</AlertTitle>
                  <ShadAlertDescription className="!text-yellow-700">
                    Using an API Token (above) is recommended. Only use the Global API Key if necessary.
                  </ShadAlertDescription>
              </Alert>

              {/* Cloudflare Global API Key (Legacy) */}
              <FormField
                control={form.control}
                name="cloudflareApiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><KeyRound className="mr-2 h-5 w-5" /> Cloudflare Global API Key (Legacy)</FormLabel>
                    <div className="relative">
                      <FormControl>
                          <Input 
                          type={showCloudflareApiKey ? "text" : "password"}
                          placeholder="Your Global API Key" 
                          {...field} 
                          className="pr-10"
                          />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 h-7 -translate-y-1/2 px-3"
                        onClick={() => setShowCloudflareApiKey(!showCloudflareApiKey)}
                        aria-label={showCloudflareApiKey ? "Hide Cloudflare API Key" : "Show Cloudflare API Key"}
                      >
                        {showCloudflareApiKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </Button>
                    </div>
                    <FormDescription>Your Cloudflare Global API Key. Found in My Profile &gt; API Tokens.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cloudflare Email (Legacy) */}
              <FormField
                control={form.control}
                name="cloudflareEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Mail className="mr-2 h-5 w-5" /> Cloudflare Account Email (for Global API Key)</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormDescription>The email address associated with your Cloudflare account (used with Global API Key).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>
            
            <Button type="submit" disabled={isLoading || isFetching} className="w-full md:w-auto mt-8">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Save Connections
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Leave fields blank if you don't want to use a particular service or wish to clear an existing key.
        </p>
      </CardFooter>
    </Card>
  );
}
