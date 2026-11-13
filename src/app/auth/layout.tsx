import Image from "next/image";
import Link from "next/link";

/**
 * Shell for every /auth page. Centres a narrow column — the pages themselves
 * supply their own Card, so this stays layout-only.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 p-6">
      <Link href="/" className="block w-full max-w-[220px]">
        <Image
          src="/brand/vistara-logo.webp"
          alt="Vistara — Window & Door Designer"
          width={2172}
          height={724}
          className="h-auto w-full rounded-lg"
          priority
        />
      </Link>

      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
