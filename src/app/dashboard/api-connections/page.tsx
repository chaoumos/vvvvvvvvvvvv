import { ApiConnectionsForm } from "@/components/dashboard/api-connections-form";

export default function ApiConnectionsPage() {
  return (
    <div className="container mx-auto py-2">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">API Connections</h1>
        <p className="text-muted-foreground">
          Manage your API keys for GitHub and Cloudflare. These keys enable automated actions like repository creation and site deployment.
        </p>
      </div>
      <ApiConnectionsForm />
    </div>
  );
}
