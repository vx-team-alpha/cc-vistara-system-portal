import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { signOutAction } from "@/server/auth";
import { portalContext } from "@/server/portal/data";

export const metadata: Metadata = {
  title: { default: "Overview · Vistara", template: "%s · Vistara" },
};

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const { account, user } = await portalContext();

  async function signOut() {
    "use server";
    await signOutAction();
    redirect("/auth/sign-in");
  }

  return (
    <SidebarProvider>
      <AppSidebar
        account={{ name: account.name || "Vistara", role: account.role }}
        user={{ name: account.name || "", email: user.email || "" }}
        signOut={signOut}
      />
      <SidebarInset className="m-2 overflow-hidden rounded-2xl border border-border bg-background shadow-xs peer-data-[variant=inset]:max-h-[calc(100svh-theme(spacing.4))] md:m-3">
        <ScrollArea className="h-full">
          <div className="relative p-4 md:p-6">
            <SidebarTrigger className="absolute top-4 right-4 z-20 flex md:hidden" />
            {children}
          </div>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  );
}
