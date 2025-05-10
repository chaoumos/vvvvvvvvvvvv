import { AiConfigForm } from "@/components/dashboard/ai-config-form";

export default function AiConfigAssistantPage() {
  return (
    <div className="container mx-auto py-2">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">AI Hugo Configuration Assistant</h1>
        <p className="text-muted-foreground">
          Let AI help you generate or update your `hugo.toml` configuration.
        </p>
      </div>
      <AiConfigForm />
    </div>
  );
}
