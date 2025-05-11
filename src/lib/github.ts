import { Octokit } from '@octokit/rest';
import type { BlogPost } from '../types'; // Adjust the path as needed

// Internal helper to format a blog post as Markdown
function formatPostToMarkdown(post: BlogPost): string {
  let content = `---
title: "${post.title}"
date: ${new Date(post.createdAt).toISOString()}
draft: ${post.status === 'draft' ? 'true' : 'false'}
`;
  // Add other frontmatter fields from your BlogPost type as needed
  // e.g., if (post.tags) content += `tags: [${post.tags.map(t => `"${t}"`).join(', ')}]\n`;
  content += `---\n\n${post.contentMarkdown || post.content || ''}`;
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
      const message = e.response?.data?.message?.toLowerCase() || e.message?.toLowerCase() || "";
      const errors = e.response?.data?.errors;
      let nameExistsInMessage = message.includes("name already exists");
      let nameExistsInErrors = false;
      if (errors && Array.isArray(errors)) {
        nameExistsInErrors = errors.some(
          (err: any) => err.resource === "Repository" && err.field === "name" && err.message?.toLowerCase().includes("already exists")
        );
      }

      if (nameExistsInMessage || nameExistsInErrors) {
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
          (wrappedError as any).status = getRepoError.status; 
          throw wrappedError;
        }
      }
    }
    // For other 422 errors, or different statuses, ensure the original error structure is propagated.
    console.error(`Error creating GitHub repository ${owner}/${repoName}:`, e.status, e.message, e.response?.data);
    throw e;
  }
}

export async function createInitialCommitWithReadme(
  octokit: Octokit,
  owner: string,
  repo: string,
  readmeTitle: string, 
  defaultBranchName: string
): Promise<{ commitSha: string }> {
  const readmeContent = `# ${readmeTitle}\n\nThis repository was created by HugoHost. Add your blog posts in the HugoHost dashboard.`;
  
  // 1. Create Blob for README
  const { data: readmeBlob } = await octokit.git.createBlob({
    owner,
    repo,
    content: readmeContent,
    encoding: 'utf-8',
  });

  // 2. Create Tree for README
  const { data: readmeTree } = await octokit.git.createTree({
    owner,
    repo,
    tree: [{ path: 'README.md', mode: '100644', type: 'blob', sha: readmeBlob.sha }],
    // No base_tree for the very first commit's tree
  });

  // 3. Create Initial Commit
  const { data: initialCommit } = await octokit.git.createCommit({
    owner,
    repo,
    message: 'Initial commit: Add README.md',
    tree: readmeTree.sha,
    parents: [], // No parents for the initial commit
  });

  // 4. Create the branch reference
  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${defaultBranchName}`,
    sha: initialCommit.sha,
  });

  return { commitSha: initialCommit.sha };
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

  const filesToCommit: { path: string; content: string; mode: '100644'; type: 'blob' }[] = [];
  for (const post of posts) {
    const slug = (post.title || `post-${post.id}`).toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    const filePath = `content/posts/${slug}.md`; // Assuming a Hugo structure
    filesToCommit.push({
      path: filePath,
      content: formatPostToMarkdown(post),
      mode: '100644',
      type: 'blob',
    });
  }

  // 1. Get the latest commit SHA and its tree SHA to use as a base
  const { data: latestCommitData } = await octokit.repos.getCommit({
    owner,
    repo,
    ref: branchName, 
  });
  const latestCommitSha = latestCommitData.sha;
  const baseTreeSha = latestCommitData.commit.tree.sha;

  // 2. Create blobs for all blog posts
  const blobCreationPromises = filesToCommit.map(file =>
    octokit.git.createBlob({
      owner,
      repo,
      content: file.content,
      encoding: 'utf-8',
    }).then(response => ({
      path: file.path,
      sha: response.data.sha,
      mode: file.mode,
      type: file.type,
    }))
  );
  const createdBlobs = await Promise.all(blobCreationPromises);

  // 3. Create a new tree with the new blobs, based on the latest commit's tree
  const { data: newTree } = await octokit.git.createTree({
    owner,
    repo,
    tree: createdBlobs.map(b => ({ path: b.path, mode: b.mode, type: b.type, sha: b.sha })),
    base_tree: baseTreeSha,
  });

  // 4. Create a new commit with the new tree
  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo,
    message: `Add/Update ${posts.length} blog post(s)`,
    tree: newTree.sha,
    parents: [latestCommitSha], 
  });

  // 5. Update the branch reference to point to the new commit
  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${branchName}`,
    sha: newCommit.sha,
  });

  console.log(`Successfully committed ${posts.length} post(s) to GitHub in ${owner}/${repo} on branch ${branchName}. Commit SHA: ${newCommit.sha}`);
  return { commitSha: newCommit.sha };
}


// This function remains for committing a single post, potentially for updates outside the initial creation flow.
export async function commitPostToGitHub(
  post: BlogPost,
  owner: string,
  repo: string,
  octokit: Octokit,
  defaultBranchName: string
): Promise<void> {
  try {
    const markdownContent = formatPostToMarkdown(post);
    const slug = (post.title || `post-${post.id}`).toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    const filePath = `content/posts/${slug}.md`;

    const { data: latestCommit } = await octokit.repos.getCommit({
      owner,
      repo,
      ref: defaultBranchName,
    });
    const baseTreeSha = latestCommit.commit.tree.sha;

    const { data: newBlob } = await octokit.git.createBlob({
      owner,
      repo,
      content: markdownContent,
      encoding: 'utf-8',
    });

    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      tree: [{ path: filePath, mode: '100644', type: 'blob', sha: newBlob.sha }],
      base_tree: baseTreeSha,
    });

    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo,
      message: `Update post: ${post.title || post.id}`,
      tree: newTree.sha,
      parents: [latestCommit.sha],
    });

    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${defaultBranchName}`,
      sha: newCommit.sha,
    });

    console.log(`Successfully committed post "${post.title || post.id}" to GitHub: ${filePath}`);

  } catch (error: any) {
    console.error(`Error committing post "${post.title || post.id}" to GitHub:`, error);
    throw new Error(`Failed to commit post to GitHub: ${error.message || 'Unknown error'}`);
  }
}