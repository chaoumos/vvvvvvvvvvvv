
"use server";

import { addBlog, simulateBlogCreationProcess } from "@/lib/firebase/firestore";
import type { Blog, SelectedTheme } from "@/lib/types";
import { predefinedThemes } from "@/lib/themes";
import { createBlogSchema, type CreateBlogFormValues } from "./schema"; 

interface ActionResult {
  success: boolean;
  blogId?: string;
  message?: string;
  error?: string;
  issues?: Record<string, string[] | undefined>;
}

export async function createBlogAction(values: CreateBlogFormValues): Promise<ActionResult> {
  try {
    const validatedFields = createBlogSchema.safeParse(values);
    if (!validatedFields.success) {
      return { 
        success: false, 
        error: "Invalid input. Please check the fields below.", 
        issues: validatedFields.error.flatten().fieldErrors 
      };
    }

    const { 
      userId, 
      siteName, 
      blogTitle, 
      description, 
      themeType, 
      selectedPredefinedTheme, 
      customThemeUrl, 
      githubPat,
      githubApiKey // Destructure the new field
    } = validatedFields.data;
    
    if (!userId) {
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
      return { success: false, error: "Theme information is missing or invalid." };
    }
    
    const blogData: Omit<Blog, 'id' | 'userId' | 'createdAt' | 'status'> = {
      siteName,
      blogTitle,
      description,
      theme,
      pat: githubPat, 
      githubApiKey, // Include the new field in blog data
    };

    const blogId = await addBlog(userId, blogData);

    // Start simulation (in real app, trigger Cloud Function)
    if (blogId) { // Only proceed if blogId was successfully obtained
        simulateBlogCreationProcess(blogId, siteName);
    } else {
        // This case should ideally not be reached if addBlog throws on failure,
        // but as a safeguard:
        return { success: false, error: "Failed to obtain blog ID after adding to database." };
    }
    

    return { success: true, blogId: blogId, message: "Blog creation process initiated!" };

  } catch (error) {
    console.error("Create blog action error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: `Failed to create blog. Details: ${errorMessage}` };
  }
}
