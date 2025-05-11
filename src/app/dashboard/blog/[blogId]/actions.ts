
"use server";

import { addBlogPost, getBlog, getApiConnection, updateBlogStatus } from "@/lib/firebase/firestore";
import type { BlogPost, ApiConnection as UserApiConnection } from "@/lib/types";
import { createPostSchema, type CreatePostFormValues } from "./new-post/schema"; 
import { createCloudflarePagesProject, getCloudflarePagesProject } from "@/lib/cloudflare";

interface ActionResult {
  success: boolean;
  message?: string;
  postId?: string;
  error?: string;
  issues?: Record<string, string[] | undefined>;
  liveUrl?: string;
}

export async function createPostAction(
  userId: string,
  blogId: string,
  values: CreatePostFormValues
): Promise<ActionResult> {
  if (!userId || !blogId) {
    return { success: false, error: "User ID or Blog ID is missing." };
  }

  const validatedFields = createPostSchema.safeParse(values);
  if (!validatedFields.success) {
    return {
      success: false,
      error: "Invalid input.",
      issues: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const postData: Omit<BlogPost, 'id' | 'blogId' | 'userId' | 'createdAt' | 'updatedAt'> = {
      title: validatedFields.data.title,
      content: validatedFields.data.content,
    };

    const postId = await addBlogPost(userId, blogId, postData);
    return { success: true, postId, message: "Post created successfully." };

  } catch (error) {
    console.error("Create post action error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: `Failed to create post: ${errorMessage}` };
  }
}


export async function deployToCloudflareAction(userId: string, blogId: string): Promise<ActionResult> {
  if (!userId || !blogId) {
    return { success: false, error: "User ID or Blog ID is missing." };
  }

  await updateBlogStatus(blogId, 'cloudflare_deploy_pending', { deploymentNote: "Initiating Cloudflare Pages deployment..." });

  try {
    const apiConnection: UserApiConnection | null = await getApiConnection(userId);
    if (!apiConnection?.cloudflareAccountId || (!apiConnection.cloudflareApiToken && (!apiConnection.cloudflareApiKey || !apiConnection.cloudflareEmail))) {
      await updateBlogStatus(blogId, 'cloudflare_deployment_failed', { error: "Cloudflare API credentials or Account ID not found. Please configure them in API Connections." });
      return { success: false, error: "Cloudflare API credentials or Account ID not configured." };
    }

    const blog = await getBlog(blogId, userId);
    if (!blog) {
      await updateBlogStatus(blogId, 'cloudflare_deployment_failed', { error: "Blog not found or access denied." });
      return { success: false, error: "Blog not found or access denied." };
    }

    if (!blog.githubRepoUrl) {
      await updateBlogStatus(blogId, 'cloudflare_deployment_failed', { error: "GitHub repository URL is missing. Cannot deploy." });
      return { success: false, error: "GitHub repository URL is missing for this blog." };
    }
    
    if (blog.status === 'cloudflare_live' && blog.liveUrl) {
        return { success: true, message: `Blog is already live on Cloudflare: ${blog.liveUrl}`, liveUrl: blog.liveUrl };
    }

    const githubRepoParts = blog.githubRepoUrl.replace(/^https?:\/\//, '').split('/');
    if (githubRepoParts.length < 3) { // e.g. github.com/owner/repo
        await updateBlogStatus(blogId, 'cloudflare_deployment_failed', { error: "Invalid GitHub repository URL format." });
        return { success: false, error: "Invalid GitHub repository URL format." };
    }
    const githubOwner = githubRepoParts[1];
    const githubRepoName = githubRepoParts[2].replace('.git', '');
    const githubRepoFullName = `${githubOwner}/${githubRepoName}`;

    // Use blog.siteName as the Cloudflare Pages project name for consistency
    const cloudflareProjectName = blog.siteName;

    await updateBlogStatus(blogId, 'deploying_to_cloudflare', { 
      deploymentNote: `Creating/linking Cloudflare Pages project: ${cloudflareProjectName}...`,
      cloudflarePagesProjectName: cloudflareProjectName,
      cloudflareAccountId: apiConnection.cloudflareAccountId 
    });

    // Check if project already exists
    let existingProject = await getCloudflarePagesProject(apiConnection, apiConnection.cloudflareAccountId, cloudflareProjectName);

    if (!existingProject) {
        console.log(`Cloudflare project ${cloudflareProjectName} not found. Creating new project.`);
        existingProject = await createCloudflarePagesProject(
            apiConnection,
            apiConnection.cloudflareAccountId,
            cloudflareProjectName,
            githubRepoFullName,
            'main' // Assuming 'main' as the production branch, this could be configurable later
            // Add Hugo version if needed, e.g., blog.hugoVersion || "0.110.0"
        );
    } else {
        console.log(`Cloudflare project ${cloudflareProjectName} already exists. Using existing project.`);
        // Optionally, here you could trigger a new deployment if needed,
        // but Cloudflare usually auto-deploys on new commits to the production branch.
    }
    

    // Cloudflare Pages URLs are typically <project-name>.pages.dev
    // The `subdomain` field from project details is usually just the project name.
    const liveUrl = `https://${existingProject.name}.pages.dev`;

    await updateBlogStatus(blogId, 'cloudflare_live', { 
      liveUrl,
      deploymentNote: `Successfully deployed to Cloudflare Pages! Live at: ${liveUrl}`,
      cloudflarePagesProjectName: existingProject.name,
    });

    return { success: true, message: `Blog deployed to Cloudflare Pages! Live at: ${liveUrl}`, liveUrl };

  } catch (error) {
    console.error("Cloudflare deployment action error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred during Cloudflare deployment.";
    await updateBlogStatus(blogId, 'cloudflare_deployment_failed', { error: `Cloudflare deployment failed: ${errorMessage}` });
    return { success: false, error: `Cloudflare deployment failed: ${errorMessage}` };
  }
}
