import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PortalShell } from "@/components/portal/shell";
import { signOutAction } from "@/server/auth";
import { portalContext } from "@/server/portal/data";
export const metadata: Metadata = {
  title: { default: "Overview · Vistara", template: "%s · Vistara" },
};
export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const [{ account, user }, cookieStore] = await Promise.all([portalContext(), cookies()]);
  const role = account.role ?? "user";
  const initialTheme = cookieStore.get("frontage-theme")?.value === "dark" ? "dark" : "light";
  async function signOut() {
    "use server";
    await signOutAction();
    redirect("/auth/sign-in");
  }
  return (
    <PortalShell
      name={account.name || ""}
      email={user.email || ""}
      role={role}
      initialTheme={initialTheme}
      signOut={signOut}
    >
      {children}
    </PortalShell>
  );
}
