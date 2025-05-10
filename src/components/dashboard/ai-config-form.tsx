
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
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { generateHugoConfigAction, aiConfigSchema, type AiConfigFormValues } from "@/app/dashboard/ai-config-assistant/actions";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, FileText, Loader2, Copy } from "lucide-react";

export function AiConfigForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<string | null>(null);

  const form = useForm<AiConfigFormValues>({
    resolver: zodResolver(aiConfigSchema),
    defaultValues: {
      projectTitle: "",
      blogName: "",
      userPrompt: "",
    },
  });

  async function onSubmit(values: AiConfigFormValues) {
    setIsLoading(true);
    setGeneratedConfig(null);
    try {
      const result = await generateHugoConfigAction(values);
      if (result.error) {
        toast({
          title: "Generation Failed",
          description: result.message || result.error,
          variant: "destructive",
        });
         if (result.issues) {
            Object.entries(result.issues).forEach(([field, errors]) => {
                if (errors && errors.length > 0) {
                    form.setError(field as keyof AiConfigFormValues, { message: errors[0] });
                }
            });
        }
      } else if (result.success && result.hugoConfig) {
        setGeneratedConfig(result.hugoConfig);
        toast({
          title: "Configuration Generated!",
          description: "Your hugo.toml content is ready.",
        });
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

  const handleCopyToClipboard = () => {
    if (generatedConfig) {
      navigator.clipboard.writeText(generatedConfig)
        .then(() => {
          toast({ title: "Copied!", description: "Hugo config copied to clipboard." });
        })
        .catch(() => {
          toast({ title: "Copy Failed", description: "Could not copy to clipboard.", variant: "destructive" });
        });
    }
  };

  return (
    <div className="space-y-8">
      <Card className="w-full max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">AI Assistant Input</CardTitle>
          <CardDescription>Provide details for the AI to generate your `hugo.toml`.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="projectTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Title</FormLabel>
                    <FormControl>
                      <Input placeholder="My Awesome Project" {...field} />
                    </FormControl>
                    <FormDescription>The overall title of your project or website.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="blogName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blog Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Tech Insights Blog" {...field} />
                    </FormControl>
                    <FormDescription>The specific name for this blog section or site.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="userPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Prompt</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Create a simple blog configuration with a dark theme, enable related posts, and configure basic SEO meta tags."
                        className="resize-y min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Describe what you want in your `hugo.toml`. Be as specific as possible.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate Configuration
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {generatedConfig && (
        <Card className="w-full max-w-3xl mx-auto shadow-xl mt-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center">
                <FileText className="mr-2 h-6 w-6 text-primary" />
                Generated `hugo.toml`
              </CardTitle>
              <CardDescription>Review and copy the generated configuration below.</CardDescription>
            </div>
            <Button variant="outline" size="icon" onClick={handleCopyToClipboard}>
              <Copy className="h-5 w-5" />
              <span className="sr-only">Copy to Clipboard</span>
            </Button>
          </CardHeader>
          <CardContent>
            <Textarea
              readOnly
              value={generatedConfig}
              className="min-h-[300px] resize-y font-mono text-sm bg-muted/50"
              aria-label="Generated Hugo TOML configuration"
            />
          </CardContent>
           <CardFooter>
            <p className="text-xs text-muted-foreground">
              This configuration is AI-generated. Always review it carefully before use.
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
