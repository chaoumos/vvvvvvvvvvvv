
import { BlogDetailDisplay } from "@/components/dashboard/blog-detail-display";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function BlogDetailPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full rounded-lg" /> {/* For blog header card */}
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-8 w-48" /> {/* For "Posts" heading */}
        <Skeleton className="h-10 w-36" /> {/* For "Create New Post" button */}
      </div>
      <div className="space-y-4"> {/* For post list skeleton */}
        {[...Array(2)].map((_, i) => (
           <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}


export default function BlogDetailPage({ params }: { params: { blogId: string } }) {
  const { blogId } = params;

  if (!blogId) {
    return (
        <div className="container mx-auto py-8">
            <p className="text-destructive">Error: Blog ID is missing.</p>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Suspense fallback={<BlogDetailPageSkeleton />}>
        <BlogDetailDisplay blogId={blogId} />
      </Suspense>
    </div>
  );
}
