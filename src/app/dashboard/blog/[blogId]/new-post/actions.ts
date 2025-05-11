
"use server";

import { addBlogPost } from "@/lib/firebase/firestore";
import type { BlogPost } from "@/lib/types";
import { createPostSchema, type CreatePostFormValues } from "./schema";

interface ActionResult {
  success: boolean;
  postId?: string;
  error?: string;
  issues?: Record<string, string[] | undefined>;
}

export async function createPostAction(
  userId: string,
  blogId: string,
  values: CreatePostFormValues
): Promise<ActionResult> {
  if (!userId || !blogId) {
    return { success: false, error: "User ID or Blog ID is missing." };
  }

  const validatedFields = createPostSchema.safeParse(values);
  if (!validatedFields.success) {
    return {
      success: false,
      error: "Invalid input.",
      issues: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const postData: Omit<BlogPost, 'id' | 'blogId' | 'userId' | 'createdAt' | 'updatedAt'> = {
      title: validatedFields.data.title,
      content: validatedFields.data.content,
      // Other fields like slug, tags can be added here if needed
    };

    const postId = await addBlogPost(userId, blogId, postData);
    return { success: true, postId };

  } catch (error) {
    console.error("Create post action error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: `Failed to create post: ${errorMessage}` };
  }
}
