"use server";

import { addBlog, simulateBlogCreationProcess } from "@/lib/firebase/firestore";
import type { Blog, SelectedTheme } from "@/lib/types";
import { predefinedThemes } from "@/lib/themes";
import { createBlogSchema, type CreateBlogFormValues } from "./schema"; 

// Define a more specific return type for the action
interface ActionResult {
  success: boolean;
  blogId?: string;
  message?: string;
  error?: string;
  issues?: Record<string, string[] | undefined>;
}

export async function createBlogAction(values: CreateBlogFormValues): Promise<ActionResult> {
  try {
    // Note: The schema now includes userId, so it should be present in `values`.
    // The form component's onSubmit is responsible for adding `user.uid` to the values.
    const validatedFields = createBlogSchema.safeParse(values);
    if (!validatedFields.success) {
      return { 
        success: false, 
        error: "Invalid input. Please check the fields below.", 
        issues: validatedFields.error.flatten().fieldErrors 
      };
    }

    const { 
      userId, // userId is now expected from validatedFields.data
      siteName, 
      blogTitle, 
      description, 
      themeType, 
      selectedPredefinedTheme, 
      customThemeUrl, 
      githubPat 
    } = validatedFields.data;
    
    if (!userId) { // Should not happen if schema requires it and form passes it
        return { success: false, error: "User ID is missing." };
    }

    let theme: SelectedTheme;
    if (themeType === "predefined" && selectedPredefinedTheme) {
      const foundTheme = predefinedThemes.find(t => t.id === selectedPredefinedTheme);
      if (!foundTheme) return { success: false, error: "Invalid predefined theme selected." };
      theme = { name: foundTheme.name, gitUrl: foundTheme.gitUrl, isCustom: false };
    } else if (themeType === "custom" && customThemeUrl) {
      theme = { name: "Custom Theme", gitUrl: customThemeUrl, isCustom: true };
    } else {
      // This case should ideally be caught by schema validation (superRefine)
      return { success: false, error: "Theme information is missing or invalid." };
    }
    
    const blogData: Omit<Blog, 'id' | 'userId' | 'createdAt' | 'status'> = {
      siteName,
      blogTitle,
      description,
      theme,
      pat: githubPat, 
    };

    const blogId = await addBlog(userId, blogData);

    // Start simulation (in real app, trigger Cloud Function)
    // No await here, let it run in background. Client will see updates via Firestore listener.
    simulateBlogCreationProcess(blogId, siteName);

    return { success: true, blogId: blogId, message: "Blog creation process initiated!" };

  } catch (error) {
    console.error("Create blog action error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: `Failed to create blog. Details: ${errorMessage}` };
  }
}