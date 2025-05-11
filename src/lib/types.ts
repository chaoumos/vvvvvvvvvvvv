
import type { User as FirebaseUser } from 'firebase/auth';

export interface UserProfile extends FirebaseUser {
  // Add any custom profile properties here if needed
}

export type BlogStatus = 
  | "pending" 
  | "creating_repo" 
  | "preparing_site_structure"
  | "generating_config"
  | "configuring_theme" 
  | "pushing_content_to_repo" // This could be considered 'deploying_to_github'
  | "ready_for_deployment" // Previously 'live' after GitHub push, now means ready for Cloudflare
  | "cloudflare_deploy_pending" // User initiated Cloudflare deployment
  | "deploying_to_cloudflare" // Cloudflare Pages project creation/deployment in progress
  | "cloudflare_live" // Successfully deployed to Cloudflare
  | "cloudflare_deployment_failed" // Cloudflare deployment failed
  | "failed"; // General failure, or GitHub specific failure if not covered by Cloudflare statuses


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
  id?: string; 
}

export interface Blog {
  id: string; 
  userId: string;
  name: string; 
  siteName: string; 
  blogTitle: string;
  description: string; 
  theme: SelectedTheme;
  githubRepoUrl?: string;
  liveUrl?: string; // This will now be the Cloudflare live URL
  status: BlogStatus;
  createdAt: number; 
  pat?: string; 
  githubApiKey?: string; 
  error?: string;
  deploymentNote?: string; 
  cloudflarePagesProjectName?: string; // Name of the Cloudflare Pages project
  cloudflareAccountId?: string; // Store the account ID used for deployment for reference
}

export interface ApiConnection {
  userId: string; 
  githubApiKey?: string;
  cloudflareApiToken?: string; 
  cloudflareApiKey?: string; // Legacy Global API Key for Cloudflare
  cloudflareEmail?: string; // Email for legacy Cloudflare API Key
  cloudflareAccountId?: string; // Cloudflare Account ID
}

export interface BlogPost {
  id: string; 
  blogId: string; 
  userId: string; 
  title: string;
  content: string; 
  contentMarkdown?: string; 
  status?: 'draft' | 'published'; 
  description?: string; 
  createdAt: number; 
  updatedAt?: number; 
}


export interface GitHubRepoInfo { 
  html_url: string;
  default_branch: string;
  name: string;
}

// Cloudflare specific types
export interface CloudflarePagesProjectSource {
  type: "github";
  config: {
    owner: string;
    repo_name: string;
    production_branch: string;
    pr_comments_enabled?: boolean;
    deployments_enabled?: boolean;
  };
}

export interface CloudflarePagesBuildConfig {
  build_command?: string;
  destination_dir?: string;
  root_dir?: string;
  web_analytics_tag?: string | null;
  web_analytics_token?: string | null;
  fast_builds?: boolean;
}

export interface CloudflarePagesDeploymentEnvVars {
  [key: string]: { value: string };
}

export interface CloudflarePagesDeploymentConfig {
  compatibility_date?: string;
  compatibility_flags?: string[];
  env_vars?: CloudflarePagesDeploymentEnvVars;
}

export interface CloudflarePagesProjectRequest {
  name: string;
  build_config: CloudflarePagesBuildConfig;
  source: CloudflarePagesProjectSource;
  deployment_configs: {
    production: CloudflarePagesDeploymentConfig;
    preview?: CloudflarePagesDeploymentConfig;
  };
}

export interface CloudflarePagesProject {
  id: string;
  name: string;
  subdomain: string; // e.g., "myproject.pages.dev" but usually just "myproject"
  domains: string[];
  source: CloudflarePagesProjectSource;
  build_config: CloudflarePagesBuildConfig;
  deployment_configs: {
    production: CloudflarePagesDeploymentConfig;
    preview: CloudflarePagesDeploymentConfig;
  };
  latest_deployment: any; // Can be more specific if needed
  created_on: string;
  canonical_deployment: any; // Can be more specific
}

export interface CloudflareApiErrorDetail {
  code: number;
  message: string;
}

export interface CloudflareApiResponseError {
  success: false;
  errors: CloudflareApiErrorDetail[];
  messages: CloudflareApiErrorDetail[]; // Sometimes messages are used
}

export interface CloudflareApiResponseSuccess<T> {
  success: true;
  result: T;
  errors: [];
  messages: [];
}
