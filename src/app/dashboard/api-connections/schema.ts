import { z } from "zod";

export const apiConnectionsSchema = z.object({
  githubApiKey: z.string().optional().or(z.literal('')),
  cloudflareApiToken: z.string().optional().or(z.literal('')),
  cloudflareApiKey: z.string().optional().or(z.literal('')), // Legacy Global API Key
  cloudflareEmail: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')), // For legacy key
  cloudflareAccountId: z.string().optional().or(z.literal('')),
});

export type ApiConnectionsFormValues = z.infer<typeof apiConnectionsSchema>;
