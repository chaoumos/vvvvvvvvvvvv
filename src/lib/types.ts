
import type { User as FirebaseUser } from 'firebase/auth';

export interface UserProfile extends FirebaseUser {
  // Add any custom profile properties here if needed
}

export type BlogStatus = 
  | "pending" 
  | "creating_repo" 
  | "configuring_theme" 
  | "deploying" 
  | "live" 
  | "failed"
  | "generating_config";

export interface HugoTheme {
  id: string;
  name: string;
  gitUrl: string;
  imageUrl?: string;
  description?: string;
  tags?: string[];
  dataAiHint?: string; 
}

export interface SelectedTheme {
  name: string;
  gitUrl: string;
  isCustom: boolean;
}

export interface Blog {
  id: string; // Firestore document ID
  userId: string;
  siteName: string; // Used for repo name, potential subdomain
  blogTitle: string;
  description: string; // For SEO
  theme: SelectedTheme;
  githubRepoUrl?: string;
  liveUrl?: string;
  status: BlogStatus;
  createdAt: number; // Firebase Timestamp or milliseconds
  pat?: string; // Optional: No longer directly set from create form
  githubApiKey?: string; // Optional: No longer directly set from create form
  error?: string;
}

export interface ApiConnection {
  userId: string; // Corresponds to the Firebase Auth UID
  githubApiKey?: string;
  cloudflareApiToken?: string; // For Cloudflare API Tokens (preferred)
  cloudflareApiKey?: string; // For legacy Cloudflare Global API Key
  cloudflareEmail?: string; // Associated with legacy Cloudflare Global API Key
  cloudflareAccountId?: string;
}

