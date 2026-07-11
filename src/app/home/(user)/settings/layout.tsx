import type { Metadata } from "next";
import Link from "next/link";
import styles from "../../dashboard.module.css";

export const metadata: Metadata = { title: "Settings" };

/**
 * Shell for /home/settings. Auth is not enforced here — `/home` is already
 * covered by `protectedPathPrefixes` in `src/proxy.ts`, and every mutation on
 * this page is independently gated by `authAction`/`authRoute` regardless of
 * what this layout does. This just supplies the page frame.
 */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className={styles.dashboard}>
      <div className={styles.content}>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.note}>Manage your account, security, and connected sign-in methods.</p>
        </div>
        <Link href="/home" className="text-sm underline underline-offset-4">Back to account</Link>
      </header>
      <div className={styles.settingsGrid}>
        {children}
      </div>
      </div>
    </main>
  );
}
