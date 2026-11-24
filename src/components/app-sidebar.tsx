"use client";

import {
  LayoutDashboard,
  FileText,
  SlidersHorizontal,
  AppWindow,
  Settings,
  ShieldCheck,
  PlusCircle,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Button } from "@/components/ui/button";
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
      title: "Door Designer",
      url: "/home/designer",
      icon: SlidersHorizontal,
    },
    {
      title: "Widgets",
      url: "/home/widgets",
      icon: AppWindow,
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
    <Sidebar variant="inset" {...props} className="border-r-0 bg-sidebar">
      <SidebarHeader className="p-4 pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="p-0 hover:bg-transparent">
              <Link href="/home" className="flex items-center gap-3">
                <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-brand-accent1 text-sm font-bold tracking-wide text-brand-accent2 shadow-sm">
                  VL
                </div>
                <div className="flex flex-col gap-0.5 text-left">
                  <span className="text-subtitle truncate font-bold text-brand-txt-primary">
                    {account.name || "Vistara Portal"}
                  </span>
                  <span className="text-caption truncate text-brand-txt-secondary">
                    Windowlink Systems
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="mt-3">
          <Button asChild variant="primary" size="sm" className="w-full justify-center shadow-xs">
            <Link href="/home/quotes/new" className="flex items-center gap-2">
              <PlusCircle className="size-4" />
              <span>New Order</span>
            </Link>
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="mt-2 space-y-4">
        <NavMain items={mainNav} label="Platform" />
        {adminNav.length > 0 && <NavMain items={adminNav} label="Administration" />}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-3">
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
