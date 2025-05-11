import { z } from "zod";

export const apiConnectionsSchema = z.object({
  githubApiKey: z.string().optional().or(z.literal('')),
  cloudflareApiToken: z.string().optional(),
  cloudflareApiKey: z.string().optional(), // Legacy Global API Key
  cloudflareEmail: z.string().email({ message: "Invalid email address." }).optional(), // For legacy key
  cloudflareAccountId: z.string().optional(),
});

export type ApiConnectionsFormValues = z.infer<typeof apiConnectionsSchema>;
