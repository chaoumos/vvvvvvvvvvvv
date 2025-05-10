
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { BlogList } from "@/components/dashboard/blog-list";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function BlogListSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-[200px] rounded-lg" />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-2">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Blogs</h1>
          <p className="text-muted-foreground">
            Manage and view your Hugo blogs.
          </p>
        </div>
        <Link href="/dashboard/create" passHref>
          <Button>
            <PlusCircle className="mr-2 h-5 w-5" />
            Create New Blog
          </Button>
        </Link>
      </div>
      
      <Suspense fallback={<BlogListSkeleton />}>
        <BlogList />
      </Suspense>
    </div>
  );
}
