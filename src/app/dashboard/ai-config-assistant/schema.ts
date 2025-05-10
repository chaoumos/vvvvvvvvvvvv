import { z } from "zod";

export const aiConfigSchema = z.object({
  projectTitle: z.string().min(3, "Project title must be at least 3 characters."),
  blogName: z.string().min(3, "Blog name must be at least 3 characters."),
  userPrompt: z.string().min(10, "Prompt must be at least 10 characters."),
});

export type AiConfigFormValues = z.infer<typeof aiConfigSchema>;
