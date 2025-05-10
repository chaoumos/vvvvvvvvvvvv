import { CreateBlogForm } from "@/components/dashboard/create-blog-form";

export default function CreateBlogPage() {
  return (
    <div className="container mx-auto py-2">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create New Hugo Blog</h1>
        <p className="text-muted-foreground">
          Fill in the details below to generate and deploy your new blog.
        </p>
      </div>
      <CreateBlogForm />
    </div>
  );
}
