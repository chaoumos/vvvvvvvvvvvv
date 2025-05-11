
import { CreatePostForm } from "@/components/dashboard/create-post-form";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function NewPostPage({ params }: { params: { blogId: string } }) {
  const { blogId } = params;

  if (!blogId) {
    return (
        <div className="container mx-auto py-8">
            <p className="text-destructive">Error: Blog ID is missing.</p>
             <Button variant="outline" asChild className="mt-4">
                <Link href="/dashboard">
                <ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Link>
            </Button>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
       <div className="mb-6">
         <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/blog/${blogId}`}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Blog
          </Link>
        </Button>
      </div>
      <CreatePostForm blogId={blogId} />
    </div>
  );
}
