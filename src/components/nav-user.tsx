"use client";

import { ChevronsUpDown, LogOut, Settings, Shield } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavUser({
  user,
  signOut,
}: {
  user: {
    name: string;
    email: string;
    role?: string;
  };
  signOut: () => Promise<void>;
}) {
  const { isMobile } = useSidebar();
  const initials = (user.name || user.email || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="h-12 rounded-xl border border-black/5 hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg bg-brand-accent1 text-xs font-bold text-brand-accent2">
                <AvatarFallback className="rounded-lg bg-brand-accent1 text-xs font-bold text-brand-accent2">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="text-subtitle truncate font-semibold text-brand-txt-primary">
                  {user.name || "My Account"}
                </span>
                <span className="text-caption truncate text-brand-txt-secondary">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-brand-txt-secondary" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl border border-border bg-popover p-1.5 shadow-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-2 font-normal">
              <div className="flex items-center gap-2.5 text-left">
                <Avatar className="h-9 w-9 rounded-lg bg-brand-accent1 text-brand-accent2">
                  <AvatarFallback className="rounded-lg bg-brand-accent1 text-xs font-bold text-brand-accent2">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="text-subtitle truncate font-bold text-brand-txt-primary">
                    {user.name || "User"}
                  </span>
                  <span className="text-caption truncate text-brand-txt-secondary">
                    {user.email}
                  </span>
                  {user.role && (
                    <span className="text-xxs mt-0.5 inline-block w-fit rounded-sm bg-brand-accent1 px-1.5 py-0.5 font-semibold tracking-wider text-brand-accent2 uppercase">
                      {user.role}
                    </span>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1 bg-border" />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link
                  href="/home/settings"
                  className="text-subtitle flex cursor-pointer items-center gap-2 rounded-md"
                >
                  <Settings className="size-4 text-brand-txt-secondary" />
                  Account Settings
                </Link>
              </DropdownMenuItem>
              {user.role === "admin" && (
                <DropdownMenuItem asChild>
                  <Link
                    href="/home/admin"
                    className="text-subtitle flex cursor-pointer items-center gap-2 rounded-md"
                  >
                    <Shield className="size-4 text-brand-txt-secondary" />
                    Admin Panel
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="my-1 bg-border" />
            <DropdownMenuItem
              onClick={() => signOut()}
              className="text-subtitle flex cursor-pointer items-center gap-2 rounded-md font-medium text-brand-accent4 focus:bg-brand-accent4/10 focus:text-brand-accent4"
            >
              <LogOut className="size-4 text-brand-accent4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
