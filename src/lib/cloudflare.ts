
import type { 
  ApiConnection, 
  CloudflarePagesProject, 
  CloudflarePagesProjectRequest,
  CloudflareApiResponseError,
  CloudflareApiResponseSuccess
} from './types';

const CLOUDFLARE_API_BASE_URL = 'https://api.cloudflare.com/client/v4';
// It's good practice to use a specific, recent Hugo version or make it configurable
const DEFAULT_HUGO_VERSION = "0.121.1"; // Example: Use a recent version

function getCloudflareApiHeaders(apiConnection: ApiConnection): Record<string, string> {
  if (apiConnection.cloudflareApiToken) {
    return {
      'Authorization': `Bearer ${apiConnection.cloudflareApiToken}`,
      'Content-Type': 'application/json',
    };
  } else if (apiConnection.cloudflareApiKey && apiConnection.cloudflareEmail) {
    return {
      'X-Auth-Email': apiConnection.cloudflareEmail,
      'X-Auth-Key': apiConnection.cloudflareApiKey,
      'Content-Type': 'application/json',
    };
  }
  throw new Error('Cloudflare API credentials (Token or API Key+Email) are not configured.');
}

export async function createCloudflarePagesProject(
  apiConnection: ApiConnection,
  accountId: string,
  projectName: string,
  githubRepoFullName: string, // Format "owner/repo"
  productionBranch: string,
  hugoVersion: string = DEFAULT_HUGO_VERSION
): Promise<CloudflarePagesProject> {
  if (!accountId) {
    throw new Error('Cloudflare Account ID is required.');
  }
  if (!projectName) {
    throw new Error('Cloudflare Pages project name is required.');
  }
  if (!githubRepoFullName || !githubRepoFullName.includes('/')) {
    throw new Error('GitHub repository full name (owner/repo) is required.');
  }

  const headers = getCloudflareApiHeaders(apiConnection);
  const [owner, repoName] = githubRepoFullName.split('/');

  const requestBody: CloudflarePagesProjectRequest = {
    name: projectName,
    build_config: {
      build_command: 'hugo',
      destination_dir: 'public',
      root_dir: '/', 
    },
    source: {
      type: 'github',
      config: {
        owner: owner,
        repo_name: repoName,
        production_branch: productionBranch,
        pr_comments_enabled: true,
        deployments_enabled: true,
      },
    },
    deployment_configs: {
      production: {
        // Use current date for compatibility_date
        compatibility_date: new Date().toISOString().split('T')[0],
        // You can add specific compatibility_flags if needed
        // compatibility_flags: ["hugo_version_3"], 
        env_vars: {
          HUGO_VERSION: { value: hugoVersion },
          // Example: Force a specific Node.js version if your theme/build needs it
          // NODE_VERSION: { value: "18" } 
        },
      },
    },
  };

  const response = await fetch(
    `${CLOUDFLARE_API_BASE_URL}/accounts/${accountId}/pages/projects`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    }
  );

  const responseData = await response.json();

  if (!response.ok || !responseData.success) {
    const apiError = responseData as CloudflareApiResponseError;
    const errorMessages = apiError.errors?.map(e => `(${e.code}) ${e.message}`).join(', ') || 
                          apiError.messages?.map(m => `(${m.code}) ${m.message}`).join(', ') ||
                          `Cloudflare API Error: Status ${response.status}`;
    console.error('Cloudflare API error creating project:', JSON.stringify(responseData, null, 2));
    throw new Error(`Failed to create Cloudflare Pages project: ${errorMessages}`);
  }

  const successData = responseData as CloudflareApiResponseSuccess<CloudflarePagesProject>;
  return successData.result;
}

// Optional: Function to get project details (can be used to check if project already exists)
export async function getCloudflarePagesProject(
  apiConnection: ApiConnection,
  accountId: string,
  projectName: string
): Promise<CloudflarePagesProject | null> {
  if (!accountId || !projectName) {
    throw new Error('Cloudflare Account ID and Project Name are required.');
  }
  const headers = getCloudflareApiHeaders(apiConnection);
  try {
    const response = await fetch(
      `${CLOUDFLARE_API_BASE_URL}/accounts/${accountId}/pages/projects/${projectName}`,
      {
        method: 'GET',
        headers,
      }
    );
    if (response.status === 404) {
      return null; // Project does not exist
    }
    const responseData = await response.json();
    if (!response.ok || !responseData.success) {
      const apiError = responseData as CloudflareApiResponseError;
      const errorMessages = apiError.errors?.map(e => `(${e.code}) ${e.message}`).join(', ') || `Cloudflare API Error: Status ${response.status}`;
      console.error('Cloudflare API error fetching project:', JSON.stringify(responseData, null, 2));
      throw new Error(`Failed to fetch Cloudflare Pages project: ${errorMessages}`);
    }
    const successData = responseData as CloudflareApiResponseSuccess<CloudflarePagesProject>;
    return successData.result;
  } catch (error) {
    console.error('Error in getCloudflarePagesProject:', error);
    // If it's an error from getCloudflareApiHeaders, it should be re-thrown
    if (error instanceof Error && error.message.startsWith('Cloudflare API credentials')) throw error;
    return null; // Or rethrow as appropriate
  }
}

// Note: Triggering a deployment manually is often not needed if the GitHub repo is linked,
// as Cloudflare Pages will auto-deploy on commits to the production branch.
// However, if explicit triggering is needed:
/*
export async function triggerCloudflarePagesDeployment(
  apiConnection: ApiConnection,
  accountId: string,
  projectName: string
): Promise<any> { // Define a more specific type for deployment result
  if (!accountId || !projectName) {
    throw new Error('Cloudflare Account ID and Project Name are required.');
  }
  const headers = getCloudflareApiHeaders(apiConnection);
  const response = await fetch(
    `${CLOUDFLARE_API_BASE_URL}/accounts/${accountId}/pages/projects/${projectName}/deployments`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({}), // Empty body or specify a branch: { "branch": "main" }
    }
  );
  const responseData = await response.json();
  if (!response.ok || !responseData.success) {
    const apiError = responseData as CloudflareApiResponseError;
    const errorMessages = apiError.errors?.map(e => `(${e.code}) ${e.message}`).join(', ') || `Cloudflare API Error: Status ${response.status}`;
    console.error('Cloudflare API error triggering deployment:', JSON.stringify(responseData, null, 2));
    throw new Error(`Failed to trigger Cloudflare Pages deployment: ${errorMessages}`);
  }
  const successData = responseData as CloudflareApiResponseSuccess<any>;
  return successData.result;
}
*/
