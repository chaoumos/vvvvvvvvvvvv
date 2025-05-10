
"use server";

import { z } from "zod";
import { generateHugoConfig, type GenerateHugoConfigInput } from "@/ai/flows/generate-hugo-config";

export const aiConfigSchema = z.object({
  projectTitle: z.string().min(3, "Project title must be at least 3 characters."),
  blogName: z.string().min(3, "Blog name must be at least 3 characters."),
  userPrompt: z.string().min(10, "Prompt must be at least 10 characters."),
});

export type AiConfigFormValues = z.infer<typeof aiConfigSchema>;

export async function generateHugoConfigAction(values: AiConfigFormValues) {
  try {
    const validatedFields = aiConfigSchema.safeParse(values);
    if (!validatedFields.success) {
      return { error: "Invalid input.", issues: validatedFields.error.flatten().fieldErrors };
    }

    const input: GenerateHugoConfigInput = validatedFields.data;
    const result = await generateHugoConfig(input);
    
    return { success: true, hugoConfig: result.hugoConfig };

  } catch (error) {
    console.error("AI Config generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { error: `Failed to generate Hugo config: ${errorMessage}` };
  }
}
