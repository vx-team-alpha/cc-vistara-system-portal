import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { toJWTUserData } from "@/lib/auth/jwt-user";
import { signOutAction } from "@/server/auth";
import { SignOutButton } from "./sign-out-button";
import styles from "./dashboard.module.css";

export const metadata: Metadata = { title: "Home" };

/**
 * The one protected page — `/home` is the only entry in `protectedPathPrefixes`.
 *
 * The proxy already bounces anonymous callers here, but this re-checks anyway:
 * the proxy is an optimistic gate, and Next's own docs warn that a matcher change
 * can silently drop coverage. A page that reads user data verifies for itself.
 */
export default async function HomePage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/sign-in?next=%2Fhome");
  }

  const user = toJWTUserData(data.claims);

  // The account row is created by the on_auth_user_created trigger inside
  // GoTrue's signup transaction, so it should always exist. RLS scopes this to
  // the caller — accounts.id IS the auth user id.
  const { data: account } = await supabase
    .from("accounts")
    .select("id, name, picture_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className={styles.dashboard}>
      <div className={styles.content}>
        <header className={styles.pageHead}>
          <div>
            <h1 className={styles.title}>Your account</h1>
            <p className={styles.note}>Manage your profile and account preferences.</p>
          </div>
        </header>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Account overview</CardTitle>
            <CardDescription>You’re signed in and your account is secure.</CardDescription>
          </CardHeader>

          <CardContent className={styles.rows}>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{user.email ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Assurance level</dt>
              <dd className="font-mono">{user.aal}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Account</dt>
              <dd className="font-medium">{account?.name ?? "(no account row)"}</dd>
            </div>
          </dl>

          <div className={styles.actions}>
            <Button asChild variant="outline">
              <Link href="/home/settings">Account settings</Link>
            </Button>

          <form
            action={async () => {
              "use server";
              await signOutAction();
              redirect("/auth/sign-in");
            }}
          >
            <SignOutButton />
          </form>
          </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
