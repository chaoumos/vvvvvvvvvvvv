
import type { User as FirebaseUser } from 'firebase/auth';

export interface UserProfile extends FirebaseUser {
  // Add any custom profile properties here if needed
}

export type BlogStatus = 
  | "pending" 
  | "creating_repo" 
  | "preparing_site_structure" // New status
  | "generating_config"
  | "configuring_theme" 
  | "pushing_content_to_repo" 
  | "deploying" 
  | "live" 
  | "failed";


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
  id?: string; // Added id to selectedTheme to better identify predefined themes
}

export interface Blog {
  id: string; // Firestore document ID
  userId: string;
  name: string; // Title of the blog, used for README title
  siteName: string; // Used for repo name, potential subdomain
  blogTitle: string;
  description: string; // For SEO
  theme: SelectedTheme;
  githubRepoUrl?: string;
  liveUrl?: string;
  status: BlogStatus;
  createdAt: number; // Firebase Timestamp or milliseconds
  pat?: string; 
  githubApiKey?: string; 
  error?: string;
  deploymentNote?: string; 
}

export interface ApiConnection {
  userId: string; 
  githubApiKey?: string;
  cloudflareApiToken?: string; 
  cloudflareApiKey?: string; 
  cloudflareEmail?: string; 
  cloudflareAccountId?: string;
}

export interface BlogPost {
  id: string; 
  blogId: string; 
  userId: string; 
  title: string;
  content: string; 
  contentMarkdown?: string; 
  status?: 'draft' | 'published'; 
  description?: string; // Added description for frontmatter
  // slug: string; 
  createdAt: number; 
  updatedAt?: number; 
  // publishedAt?: number; 
  // tags?: string[]; 
}


export interface GitHubRepoInfo { // From github.ts
  html_url: string;
  default_branch: string;
  name: string;
}
