"use client";

import { type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  badge?: string | number;
}

export function NavMain({ items, label }: { items: NavItem[]; label?: string }) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      {label && (
        <SidebarGroupLabel className="text-xxs mb-1 px-3 font-semibold tracking-wider text-brand-txt-secondary uppercase">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarMenu className="gap-1.5 px-2">
        {items.map((item) => {
          const isActive =
            item.url === "/home" ? pathname === "/home" : pathname.startsWith(item.url);

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={isActive}
                className={cn(
                  "text-subtitle h-10 rounded-lg px-3 transition-all",
                  isActive
                    ? "bg-brand-accent1 font-semibold text-brand-accent2 shadow-xs hover:bg-brand-accent1 hover:text-brand-accent2 [&>svg]:text-brand-accent2"
                    : "font-medium text-brand-txt-primary hover:bg-sidebar-accent hover:text-brand-accent0",
                )}
              >
                <Link href={item.url} className="flex items-center gap-3">
                  <item.icon
                    className={cn(
                      "size-4 shrink-0",
                      isActive ? "text-brand-accent2" : "text-brand-txt-primary",
                    )}
                  />
                  <span className="flex-1 truncate">{item.title}</span>
                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        "text-xxs ml-auto rounded-full px-1.5 py-0.5 font-bold",
                        isActive
                          ? "bg-brand-accent2 text-brand-accent1"
                          : "bg-brand-accent3 text-brand-txt-primary",
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
