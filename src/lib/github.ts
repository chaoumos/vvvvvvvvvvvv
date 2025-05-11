
import type { Octokit } from '@octokit/rest';
import type { BlogPost } from '../types'; // Adjust the path as needed

// Internal helper to format a blog post as Markdown
function formatPostToMarkdown(post: BlogPost): string {
  const frontmatterDate = post.createdAt ? new Date(post.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const draftStatus = post.status === 'draft' ? true : false;
  const description = post.description || `A summary of ${post.title.replace(/"/g, '\\"')}`;

  let content = `---
title: "${post.title.replace(/"/g, '\\"')}"
date: ${frontmatterDate}
draft: ${draftStatus}
description: "${description.replace(/"/g, '\\"')}"
---

${post.contentMarkdown || post.content || ''}
`;
  return content;
}

export async function getGitHubAuthenticatedUserLogin(octokit: Octokit): Promise<string> {
  try {
    const { data: { login } } = await octokit.users.getAuthenticated();
    return login;
  } catch (e: any) {
    console.error("Error fetching authenticated GitHub user:", e);
    throw new Error(`Failed to fetch GitHub user login: ${e.message}. Check your PAT permissions.`);
  }
}

export interface GitHubRepoInfo {
  html_url: string;
  default_branch: string;
  name: string; // Add repo name to the info
}

export async function createGitHubRepo(
  octokit: Octokit,
  owner: string,
  repoName: string,
  description: string
): Promise<GitHubRepoInfo> {
  try {
    const response = await octokit.repos.createForAuthenticatedUser({
      name: repoName,
      description,
      private: false,
      auto_init: false, // Create an empty repository
    });
    return {
      name: response.data.name,
      html_url: response.data.html_url,
      default_branch: response.data.default_branch || 'main',
    };
  } catch (e: any) {
    if (e.status === 422) {
      const responseData = e.response?.data;
      const errors = responseData?.errors;
      let nameAlreadyExists = false;

      if (errors && Array.isArray(errors)) {
        nameAlreadyExists = errors.some(
          (err: any) =>
            err.resource === "Repository" &&
            err.field === "name" &&
            err.message?.toLowerCase().includes("name already exists on this account")
        );
      }
      if (!nameAlreadyExists && responseData?.message?.toLowerCase().includes("name already exists on this account")) {
        nameAlreadyExists = true;
      }

      if (nameAlreadyExists) {
        console.warn(`Repository ${owner}/${repoName} already exists. Fetching its details.`);
        try {
          const existingRepoResponse = await octokit.repos.get({
            owner,
            repo: repoName,
          });
          return {
            name: existingRepoResponse.data.name,
            html_url: existingRepoResponse.data.html_url,
            default_branch: existingRepoResponse.data.default_branch || 'main',
          };
        } catch (getRepoError: any) {
          console.error(`Failed to fetch details for existing repository ${owner}/${repoName}:`, getRepoError);
          const wrappedError = new Error(`Repository ${repoName} already exists, but failed to fetch its details: ${getRepoError.message}`);
          (wrappedError as any).status = getRepoError.status || e.status || 500;
          (wrappedError as any).response = getRepoError.response || e.response;
          (wrappedError as any).request = getRepoError.request || e.request;
          (wrappedError as any).name = 'HttpError'; 
          throw wrappedError;
        }
      } else {
         const errorMessage = e.response?.data?.message || e.message;
         const errorDetails = e.response?.data?.errors ? ` Details: ${JSON.stringify(e.response.data.errors)}` : '';
         const fullError = new Error(`GitHub API Error (422): ${errorMessage}.${errorDetails}`);
         (fullError as any).status = 422;
         (fullError as any).response = e.response;
         (fullError as any).request = e.request;
         (fullError as any).name = 'HttpError';
         console.error(`Error creating GitHub repository ${owner}/${repoName} (422, other validation error):`, fullError);
         throw fullError;
      }
    } else {
      console.error(
        `Error creating GitHub repository ${owner}/${repoName} (Non-422 error): Status: ${e.status}, Message: ${e.message}, Response: ${JSON.stringify(e.response?.data, null, 2)}`
      );
      throw e; 
    }
  }
}


export async function commitFilesToRepo(
  octokit: Octokit,
  owner: string,
  repo: string,
  branchName: string,
  files: Array<{ path: string; content: string }>,
  commitMessage: string
): Promise<{ commitSha: string } | null> {
  if (!files || files.length === 0) {
    console.log(`No files to commit to ${owner}/${repo}.`);
    return null;
  }

  try {
    // Check if branch exists and get its current state
    const { data: branchData } = await octokit.repos.getBranch({
      owner,
      repo,
      branch: branchName,
    });
    const latestCommitSha = branchData.commit.sha;
    const baseTreeSha = branchData.commit.commit.tree.sha;

    // Branch exists, so we are updating it
    console.log(`Branch "${branchName}" exists in ${owner}/${repo}. Updating with new commit.`);

    const fileBlobs = await Promise.all(
      files.map(async (file) => {
        const { data: blobData } = await octokit.git.createBlob({
          owner,
          repo,
          content: file.content,
          encoding: 'utf-8',
        });
        return {
          path: file.path,
          sha: blobData.sha,
          mode: '100644' as const,
          type: 'blob' as const,
        };
      })
    );

    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      tree: fileBlobs,
      base_tree: baseTreeSha, // Use the existing branch's tree as base
    });

    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo,
      message: commitMessage,
      tree: newTree.sha,
      parents: [latestCommitSha], // Parent is the latest commit on the branch
    });

    await octokit.git.updateRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: newCommit.sha,
      force: false, // This should be a fast-forward
    });

    console.log(`Successfully updated branch ${branchName} in ${owner}/${repo}. Commit SHA: ${newCommit.sha}`);
    return { commitSha: newCommit.sha };

  } catch (error: any) {
    if (error.status === 404 || (error.response && error.response.status === 404)) {
      // Branch does not exist, this is likely the initial commit to an empty repo or new branch
      console.warn(`Branch "${branchName}" not found in ${owner}/${repo}. Attempting to create it with initial commit.`);
      
      const fileBlobs = await Promise.all(
        files.map(async (file) => {
          const { data: blobData } = await octokit.git.createBlob({
            owner,
            repo,
            content: file.content,
            encoding: 'utf-8',
          });
          return {
            path: file.path,
            sha: blobData.sha,
            mode: '100644' as const,
            type: 'blob' as const,
          };
        })
      );

      // For an initial commit, there's no base_tree
      const { data: newTree } = await octokit.git.createTree({
        owner,
        repo,
        tree: fileBlobs,
      });

      // For an initial commit, there are no parents
      const { data: newCommit } = await octokit.git.createCommit({
        owner,
        repo,
        message: commitMessage,
        tree: newTree.sha,
        parents: [], 
      });

      // Create the new branch reference pointing to the initial commit
      await octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: newCommit.sha,
      });

      console.log(`Successfully created branch ${branchName} in ${owner}/${repo} with initial commit. Commit SHA: ${newCommit.sha}`);
      return { commitSha: newCommit.sha };
    } else {
      // For any other errors, log and re-throw with more context
      console.error(`Error committing files to ${owner}/${repo} on branch ${branchName}:`, error.response?.data || error.message);
      let errorMessage = `Failed to commit files: ${error.message || 'Unknown error'}`;
      if (error.status) {
        errorMessage = `GitHub API Error (${error.status}): ${error.response?.data?.message || error.message}.`;
        if (error.response?.data?.documentation_url) {
          errorMessage += ` Review: ${error.response.data.documentation_url}`;
        }
        if (error.response?.data?.errors) {
           errorMessage += ` Details: ${JSON.stringify(error.response.data.errors)}`;
        }
      }
      const enrichedError = new Error(errorMessage);
      (enrichedError as any).status = error.status;
      (enrichedError as any).response = error.response; // Preserve original response for upstream handlers
      (enrichedError as any).request = error.request;
      (enrichedError as any).name = 'HttpError';
      throw enrichedError;
    }
  }
}


export async function createInitialCommitWithReadme(
  octokit: Octokit,
  owner: string,
  repo: string,
  readmeTitle: string,
  branchName: string
): Promise<{ commitSha: string }> {
  const readmeContent = `# ${readmeTitle}\n\nThis repository was created by HugoHost.`;
  const filesToCommit = [{ path: 'README.md', content: readmeContent }];
  
  const result = await commitFilesToRepo(octokit, owner, repo, branchName, filesToCommit, 'Initial commit: Add README.md');
  if (!result) {
    throw new Error('Failed to create initial commit with README.');
  }
  return result;
}


export async function commitBlogPostsToRepo(
  octokit: Octokit,
  owner: string,
  repo: string,
  branchName: string,
  posts: BlogPost[]
): Promise<{ commitSha: string } | null> {
  if (!posts || posts.length === 0) {
    console.log(`No posts to commit to ${owner}/${repo}.`);
    return null;
  }

  const filesToCommit = posts.map(post => {
    const slug = (post.title || `post-${post.id}`).toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    const filePath = `content/posts/${slug}.md`; 
    return {
      path: filePath,
      content: formatPostToMarkdown(post),
    };
  });
  
  return commitFilesToRepo(octokit, owner, repo, branchName, filesToCommit, `Add/Update ${posts.length} blog post(s)`);
}

export async function commitPostToGitHub(
  post: BlogPost,
  owner: string,
  repo: string,
  octokit: Octokit,
  defaultBranchName: string
): Promise<void> {
    const slug = (post.title || `post-${post.id}`).toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    const filePath = `content/posts/${slug}.md`;
    const filesToCommit = [{
        path: filePath,
        content: formatPostToMarkdown(post)
    }];
    const result = await commitFilesToRepo(octokit, owner, repo, defaultBranchName, filesToCommit, `Update post: ${post.title || post.id}`);
    if (!result) {
        throw new Error(`Failed to commit post "${post.title || post.id}" to GitHub`);
    }
    console.log(`Successfully committed post "${post.title || post.id}" to GitHub: ${filePath} in commit ${result.commitSha}`);
}

