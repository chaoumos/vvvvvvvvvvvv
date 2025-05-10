
import { z } from "zod";

export const createBlogSchema = z.object({
  userId: z.string().min(1, "User ID is required."), // Client must provide this for now.
  siteName: z.string().min(3, "Site name must be at least 3 characters.")
    .regex(/^[a-zA-Z0-9_-]+$/, "Site name can only contain letters, numbers, hyphens, and underscores."),
  blogTitle: z.string().min(5, "Blog title must be at least 5 characters."),
  description: z.string().min(10, "Description must be at least 10 characters.").max(160, "Description must be 160 characters or less."),
  themeType: z.enum(["predefined", "custom"]),
  selectedPredefinedTheme: z.string().optional(),
  customThemeUrl: z.string().optional(),
  githubPat: z.string().optional(), // Optional PAT
}).superRefine((data, ctx) => { // Ensure this callback is synchronous, not async
  if (data.themeType === "predefined" && !data.selectedPredefinedTheme) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please select a predefined theme.",
      path: ["selectedPredefinedTheme"],
    });
  }
  if (data.themeType === "custom" && (!data.customThemeUrl || !z.string().url().safeParse(data.customThemeUrl).success)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please provide a valid Git URL for the custom theme.",
      path: ["customThemeUrl"],
    });
  }
});

export type CreateBlogFormValues = z.infer<typeof createBlogSchema>;

