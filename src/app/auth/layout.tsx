import Link from "next/link";

/**
 * Shell for every /auth page. Centres a column with the Ladder App branding.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-brand-backgroundMain p-6">
      <Link href="/" className="group flex items-center gap-3 transition-transform active:scale-95">
        <div className="flex aspect-square size-11 items-center justify-center rounded-xl bg-brand-accent1 text-base font-bold tracking-wide text-brand-accent2 shadow-sm">
          VL
        </div>
        <div className="flex flex-col">
          <span className="text-h3 leading-tight font-bold text-brand-txt-primary">Vistara</span>
          <span className="text-caption text-brand-txt-secondary">Window & Door Designer</span>
        </div>
      </Link>

      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
