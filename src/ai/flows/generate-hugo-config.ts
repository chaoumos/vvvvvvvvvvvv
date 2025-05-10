// src/ai/flows/generate-hugo-config.ts
'use server';

/**
 * @fileOverview A flow to generate a hugo.toml file based on the project title, blog name, and user prompt.
 *
 * - generateHugoConfig - A function that handles the hugo.toml generation process.
 * - GenerateHugoConfigInput - The input type for the generateHugoConfig function.
 * - GenerateHugoConfigOutput - The return type for the generateHugoConfig function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateHugoConfigInputSchema = z.object({
  projectTitle: z.string().describe('The title of the project.'),
  blogName: z.string().describe('The name of the blog.'),
  userPrompt: z.string().describe('A prompt from the user to guide the hugo.toml generation.'),
});

export type GenerateHugoConfigInput = z.infer<typeof GenerateHugoConfigInputSchema>;

const GenerateHugoConfigOutputSchema = z.object({
  hugoConfig: z.string().describe('The generated hugo.toml file content.'),
});

export type GenerateHugoConfigOutput = z.infer<typeof GenerateHugoConfigOutputSchema>;

export async function generateHugoConfig(input: GenerateHugoConfigInput): Promise<GenerateHugoConfigOutput> {
  return generateHugoConfigFlow(input);
}

const generateHugoConfigPrompt = ai.definePrompt({
  name: 'generateHugoConfigPrompt',
  input: {schema: GenerateHugoConfigInputSchema},
  output: {schema: GenerateHugoConfigOutputSchema},
  prompt: `You are an expert in generating hugo.toml files based on user input.

  Given the project title, blog name, and user prompt, generate a hugo.toml file that is well-structured and includes relevant configurations.

  Project Title: {{{projectTitle}}}
  Blog Name: {{{blogName}}}
  User Prompt: {{{userPrompt}}}

  Ensure the generated hugo.toml includes basic configurations such as title, baseURL, languageCode, and theme.
  Provide a complete hugo.toml file content as the output.
  `,
});

const generateHugoConfigFlow = ai.defineFlow(
  {
    name: 'generateHugoConfigFlow',
    inputSchema: GenerateHugoConfigInputSchema,
    outputSchema: GenerateHugoConfigOutputSchema,
  },
  async input => {
    const {output} = await generateHugoConfigPrompt(input);
    return output!;
  }
);
