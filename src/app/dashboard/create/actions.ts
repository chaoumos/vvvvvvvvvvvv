
"use server";

import { addBlog, simulateBlogCreationProcess } from "@/lib/firebase/firestore";
import type { Blog, SelectedTheme } from "@/lib/types";
import { predefinedThemes } from "@/lib/themes";
import { createBlogSchema, type CreateBlogFormValues } from "./schema"; // Import from new schema file

// This is a simplified auth check. In a real app, use server-side Firebase Admin SDK to verify user.
async function getCurrentUserId(): Promise<string | null> {
  // This is NOT secure for server actions. Placeholder for demonstration.
  // On client, auth.currentUser is available. Server actions need a different mechanism.
  // For a real app, you'd pass an ID token and verify it with Firebase Admin SDK.
  // For now, this action will rely on the client to pass the UID, which is insecure.
  // Let's assume for this exercise the form passes the UID.
  return null; // This will be overridden by UID from form data.
}

export async function createBlogAction(values: CreateBlogFormValues) {
  try {
    const validatedFields = createBlogSchema.safeParse(values);
    if (!validatedFields.success) {
      return { error: "Invalid input.", issues: validatedFields.error.flatten().fieldErrors };
    }

    const { 
      userId, 
      siteName, 
      blogTitle, 
      description, 
      themeType, 
      selectedPredefinedTheme, 
      customThemeUrl, 
      githubPat 
    } = validatedFields.data;

    // This check is effectively bypassed due to client providing UID.
    // const currentUserId = await getCurrentUserId(); // This is a placeholder.
    // if (!currentUserId) {
    //   return { error: "User not authenticated." };
    // }

    let theme: SelectedTheme;
    if (themeType === "predefined" && selectedPredefinedTheme) {
      const foundTheme = predefinedThemes.find(t => t.id === selectedPredefinedTheme);
      if (!foundTheme) return { error: "Invalid predefined theme selected." };
      theme = { name: foundTheme.name, gitUrl: foundTheme.gitUrl, isCustom: false };
    } else if (themeType === "custom" && customThemeUrl) {
      theme = { name: "Custom Theme", gitUrl: customThemeUrl, isCustom: true };
    } else {
      return { error: "Theme information is missing or invalid." };
    }
    
    const blogData: Omit<Blog, 'id' | 'userId' | 'createdAt' | 'status'> = {
      siteName,
      blogTitle,
      description,
      theme,
      pat: githubPat, // Storing PAT like this is NOT recommended for production.
    };

    const blogId = await addBlog(userId, blogData);

    // Start simulation (in real app, trigger Cloud Function)
    // No await here, let it run in background. Client will see updates via Firestore listener.
    simulateBlogCreationProcess(blogId, siteName);

    return { success: true, blogId: blogId, message: "Blog creation process initiated!" };

  } catch (error) {
    console.error("Create blog action error:", error);
    return { error: "Failed to create blog. Please try again." };
  }
}

