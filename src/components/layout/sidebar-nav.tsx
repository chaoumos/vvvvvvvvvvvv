
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { LayoutDashboard, PlusCircle, Sparkles, Package, Github, KeyRound } from "lucide-react"; // Added KeyRound
import { cn } from "@/lib/utils";

const mainNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/create", label: "New Blog", icon: PlusCircle },
  { href: "/dashboard/ai-config-assistant", label: "AI Assistant", icon: Sparkles },
  { href: "/dashboard/api-connections", label: "API Connections", icon: KeyRound }, // New item
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col h-full">
      <SidebarMenu>
        <SidebarMenuItem className="mt-2 mb-4">
          <Link href="/dashboard" className="flex items-center gap-2 px-2">
            <Package className="h-7 w-7 text-primary" />
            <span className="text-xl font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              HugoHost
            </span>
          </Link>
        </SidebarMenuItem>
        {mainNavItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} legacyBehavior passHref>
              <SidebarMenuButton
                className={cn(
                  pathname === item.href ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/80",
                  "justify-start"
                )}
                tooltip={item.label}
                isActive={pathname === item.href}
              >
                <item.icon className="h-5 w-5" />
                <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
      <div className="mt-auto p-2 group-data-[collapsible=icon]:p-0">
         <SidebarMenu>
            <SidebarMenuItem>
                 <a href="https://github.com/firebase/studio-extra-hugo-host" target="_blank" rel="noopener noreferrer" className="block w-full">
                    <SidebarMenuButton
                        className="justify-start w-full"
                        tooltip="View on GitHub"
                        variant="ghost"
                    >
                        <Github className="h-5 w-5" />
                        <span className="group-data-[collapsible=icon]:hidden">View on GitHub</span>
                    </SidebarMenuButton>
                </a>
            </SidebarMenuItem>
         </SidebarMenu>
      </div>
    </nav>
  );
}
