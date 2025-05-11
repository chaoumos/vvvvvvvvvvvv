
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
      auto_init: false, 
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
          (wrappedError as any).name = 'HttpError'; // Maintain consistency with Octokit error structure
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
      throw e; // Re-throw original error if not 422 or if specific handling for 422 failed
    }
  }
}


// New generic function to commit multiple files
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

  let latestCommitSha: string;
  let baseTreeSha: string;

  try {
    const { data: branchData } = await octokit.repos.getBranch({
        owner,
        repo,
        branch: branchName,
    });
    latestCommitSha = branchData.commit.sha;
    baseTreeSha = branchData.commit.commit.tree.sha; // Correctly get tree SHA from commit object
  } catch (error: any) {
    if (error.status === 404 || (error.response && error.response.status === 404)) { 
      console.warn(`Branch "${branchName}" not found in ${owner}/${repo}. This might be an empty repository. Attempting to get default branch or create initial commit.`);
      // If the repo is truly empty, the createForAuthenticatedUser with auto_init: true (if we used it) would create a default branch.
      // Or, we can assume createInitialCommitWithReadme (which uses this function) will handle creating the first commit.
      // For a truly empty repo (no commits), there is no base tree. We create a tree from scratch.
      // Let's try to create an initial commit with the first file if the branch is not found and assume it's an empty repo scenario.
      // This specific handling might be better in the caller (simulateBlogCreationProcess) or by ensuring `createGitHubRepo` always auto-initializes.
      // For now, let's allow creating a tree without a base_tree if branch is not found.
      console.log(`Attempting to create commit on new/empty branch ${branchName}.`);
      const firstFile = files.shift(); // Take the first file for the initial commit
      if (!firstFile) {
        throw new Error("No files to make an initial commit.");
      }
      try {
        const { data: createCommitResponse } = await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: firstFile.path,
          message: commitMessage, // Or a more specific "Initial commit" message
          content: Buffer.from(firstFile.content).toString('base64'),
          branch: branchName, // This will create the branch if it doesn't exist
        });
        latestCommitSha = createCommitResponse.commit.sha;
        baseTreeSha = createCommitResponse.commit.tree.sha;
        console.log(`Initial commit created on new branch ${branchName} with ${firstFile.path}. Commit SHA: ${latestCommitSha}`);
        // If there are more files, proceed to commit them based on this new state.
        if (files.length === 0) return { commitSha: latestCommitSha };
        // Now files array is shorter, continue with the rest
      } catch(initialCommitError: any) {
         console.error(`Failed to create initial commit on branch ${branchName} for ${owner}/${repo}:`, initialCommitError);
         throw new Error(`Failed to create initial commit for new branch: ${initialCommitError.message || 'Unknown error'}`);
      }

    } else {
      console.error(`Error fetching latest commit for ${owner}/${repo} on branch ${branchName}:`, error);
      throw new Error(`Failed to fetch latest commit: ${error.message || 'Unknown error'}`);
    }
  }

  const fileBlobs = await Promise.all(
    files.map(async (file) => {
      const { data: blobData } = await octokit.git.createBlob({
        owner,
        repo,
        content: file.content, // Content should be string here
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
    base_tree: baseTreeSha, // This might be undefined if it's the very first commit to an empty repo.
                           // GitHub API handles undefined base_tree for root commit.
  });

  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo,
    message: commitMessage,
    tree: newTree.sha,
    parents: latestCommitSha ? [latestCommitSha] : [], // No parents if it's the root commit
  });

  await octokit.git.updateRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: newCommit.sha,
    force: false, 
  });

  console.log(`Successfully committed ${files.length} file(s) to GitHub in ${owner}/${repo} on branch ${branchName}. Commit SHA: ${newCommit.sha}`);
  return { commitSha: newCommit.sha };
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
