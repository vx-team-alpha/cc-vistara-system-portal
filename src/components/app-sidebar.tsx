"use client";

import { FileText, LayoutDashboard, Settings, ShieldCheck } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AppSidebar({
  user,
  account,
  signOut,
  ...props
}: {
  user: { name: string; email: string };
  account: { name: string; role?: string };
  signOut: () => Promise<void>;
} & React.ComponentProps<typeof Sidebar>) {
  const mainNav = [
    {
      title: "Overview",
      url: "/home",
      icon: LayoutDashboard,
    },
    {
      title: "Quotes & Orders",
      url: "/home/quotes",
      icon: FileText,
    },
    {
      title: "Settings",
      url: "/home/settings",
      icon: Settings,
    },
  ];

  const adminNav =
    account.role === "admin"
      ? [
          {
            title: "Admin Panel",
            url: "/home/admin",
            icon: ShieldCheck,
          },
        ]
      : [];

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" asChild>
              <Link href="/home" className="flex items-center gap-2">
                <div className="text-xxs flex aspect-square size-5 items-center justify-center rounded-sm bg-brand-accent1 font-bold text-brand-accent2">
                  VL
                </div>
                <div className="text-subtitle truncate font-medium text-sidebar-foreground">
                  {account.name || "Windowlink"}
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="mt-1">
        <NavMain items={mainNav} />
        {adminNav.length > 0 && <NavMain items={adminNav} />}
      </SidebarContent>

      <SidebarFooter>
        <NavUser
          user={{
            name: user.name || account.name || "User",
            email: user.email,
            role: account.role,
          }}
          signOut={signOut}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
