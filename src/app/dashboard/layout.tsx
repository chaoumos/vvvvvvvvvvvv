
"use client";
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger
} from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { UserAvatarDropdown } from '@/components/layout/user-avatar-dropdown';
import { Button } from '@/components/ui/button';
import { PanelLeft } from 'lucide-react';


export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  if (!user) {
    router.replace('/login');
    return (
       <div className="flex h-screen items-center justify-center bg-background">
        <LoadingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen >
      <Sidebar 
        variant="sidebar" 
        collapsible="icon" 
        className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
      >
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="bg-secondary">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6 shadow-sm">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" /> 
            {/* Placeholder for breadcrumbs or page title */}
          </div>
          <UserAvatarDropdown />
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
