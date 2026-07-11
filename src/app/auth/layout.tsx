import Link from "next/link";

/**
 * Shell for every /auth page. Centres a narrow column — the pages themselves
 * supply their own Card, so this stays layout-only.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 p-6">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        next-boilerplate
      </Link>

      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
