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
        <SidebarGroupLabel className="text-xxs mb-1 px-2 font-semibold tracking-wider text-brand-txt-secondary uppercase">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarMenu className="gap-3">
        {items.map((item) => {
          const isActive =
            item.url === "/home" ? pathname === "/home" : pathname.startsWith(item.url);

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title} isActive={isActive}>
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
