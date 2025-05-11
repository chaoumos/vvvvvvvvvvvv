import { ApiConnectionsForm } from "@/components/dashboard/api-connections-form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function ApiConnectionsPage() {
  return (
    <div className="container mx-auto py-2">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">API Connections</h1>
        <p className="text-muted-foreground">
          Manage your API keys for GitHub and Cloudflare. These keys enable automated actions like repository creation and site deployment.
        </p>
      </div>

      <Accordion type="multiple" className="w-full">
        <AccordionItem value="github">
          <AccordionTrigger>GitHub</AccordionTrigger>
          <AccordionContent>
            <p className="text-muted-foreground mb-4">Connect your GitHub account to enable repository creation and management.</p>
            <ApiConnectionsForm provider="github" />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cloudflare">
          <AccordionTrigger>Cloudflare</AccordionTrigger>
          <AccordionContent>
             <p className="text-muted-foreground mb-4">Connect your Cloudflare account to enable site deployment and management.</p>
            <ApiConnectionsForm provider="cloudflare" />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
