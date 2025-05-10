
"use server";

import { generateHugoConfig, type GenerateHugoConfigInput } from "@/ai/flows/generate-hugo-config";
import { aiConfigSchema, type AiConfigFormValues } from "./schema"; // Import from new schema file

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

