"use client";
import {
  DashboardSquare01Icon,
  Mail01Icon,
  Settings01Icon,
  Menu01Icon,
  Moon02Icon,
  Sun01Icon,
  Logout01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Icon } from "./icon";

import s from "./portal.module.css";
const links = [
  { href: "/home", label: "Overview", icon: DashboardSquare01Icon },
  { href: "/home/quotes", label: "Quotes", icon: Mail01Icon },
  { href: "/home/settings", label: "Settings", icon: Settings01Icon },
];
const subscribeTheme = (notify: () => void) => {
  window.addEventListener("storage", notify);
  window.addEventListener("frontage-theme", notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener("frontage-theme", notify);
  };
};
const readTheme = () => {
  try {
    return localStorage.getItem("frontage-theme") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
};
const subscribeMobile = (notify: () => void) => {
  const media = window.matchMedia("(max-width:860px)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
export function PortalShell({
  name,
  email,
  initialTheme = "light",
  signOut,
  children,
}: {
  name: string;
  email: string;
  initialTheme?: "light" | "dark";
  signOut: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => initialTheme);
  const mobile = useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia("(max-width:860px)").matches,
    () => false,
  );
  const menuButton = useRef<HTMLButtonElement>(null);
  const active = links.find((l) =>
    l.href === "/home" ? pathname === l.href : pathname.startsWith(l.href),
  );
  function toggleTheme() {
    const style = document.createElement("style");
    style.textContent = "*,*::before,*::after{transition:none !important}";
    document.head.appendChild(style);
    const next = theme === "light" ? "dark" : "light";
    try {
      localStorage.setItem("frontage-theme", next);
    } catch {}
    try {
      document.cookie = `frontage-theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    } catch {}
    window.dispatchEvent(new Event("frontage-theme"));
    document.documentElement.getBoundingClientRect();
    requestAnimationFrame(() => requestAnimationFrame(() => style.remove()));
  }
  const breadcrumbLabel = active?.label || "Workspace";
  return (
    <div className={s.app} data-theme={theme} data-admin-app>
      <a href="#main-content" className={s.skipLink}>
        Skip to content
      </a>
      <aside
        className={s.side}
        data-open={open || undefined}
        id="portal-navigation"
        inert={mobile && !open}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            menuButton.current?.focus();
          }
        }}
      >
        <Link href="/home" className={s.brand}>
          <span className={s.brandMark}>
            <Image src="/brand/vistara-mark.webp" alt="" width={32} height={30} priority />
          </span>
          <span>
            <strong>Vistara</strong>
            <small>Window &amp; Door Designer</small>
          </span>
        </Link>
        <button
          type="button"
          className={`${s.iconBtn} ${s.mobileMenu}`}
          aria-label="Close menu"
          onClick={() => {
            setOpen(false);
            menuButton.current?.focus();
          }}
        >
          <Icon icon={Cancel01Icon} />
        </button>
        <div className={s.navGroup}>Workspace</div>
        <nav className={s.nav} aria-label="Main navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={s.navLink}
              onClick={() => setOpen(false)}
              data-active={active?.href === link.href || undefined}
              aria-current={active?.href === link.href ? "page" : undefined}
            >
              <Icon icon={link.icon} />
              {link.label}
            </Link>
          ))}
        </nav>
        <div className={s.sideFoot}>
          <span className={s.avatar}>{(name || email || "V").slice(0, 2).toUpperCase()}</span>
          <div className={s.account}>
            <strong>{name || "Your account"}</strong>
            <small>{email}</small>
          </div>
          <form action={signOut}>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Sign out"
              data-test="portal-sign-out"
            >
              <Icon icon={Logout01Icon} />
            </Button>
          </form>
        </div>
      </aside>
      <div className={s.work}>
        <header className={s.topbar}>
          <div className={s.topActions}>
            <Button
              ref={menuButton}
              type="button"
              variant="ghost"
              size="icon"
              className={`${s.mobileMenu} size-8`}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-controls="portal-navigation"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              <Icon icon={open ? Cancel01Icon : Menu01Icon} />
            </Button>
            <div className={s.breadcrumb}>
              Workspace <span aria-hidden="true">/</span>
              <strong>{breadcrumbLabel}</strong>
            </div>
          </div>
          <div className={s.topActions}>
            <Badge variant="secondary">Order workspace</Badge>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={toggleTheme}
              aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
            >
              <Icon icon={theme === "light" ? Moon02Icon : Sun01Icon} />
            </Button>
          </div>
        </header>
        <main id="main-content" className={s.main}>
          {children}
        </main>
      </div>
    </div>
  );
}
