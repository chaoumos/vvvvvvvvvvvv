
import { z } from "zod";

export const createPostSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters.").max(100, "Title must be 100 characters or less."),
  content: z.string().min(10, "Content must be at least 10 characters."),
  // blogId and userId will be passed directly to the action, not from the form fields typically
});

export type CreatePostFormValues = z.infer<typeof createPostSchema>;
