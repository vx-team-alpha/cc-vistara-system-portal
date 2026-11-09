'use client';
import { useSyncExternalStore, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { DashboardSquare01Icon, CodeIcon, Mail01Icon, Settings01Icon, Menu01Icon, Moon02Icon, Sun01Icon, Logout01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { Icon } from './icon';
import s from './portal.module.css';
const links = [
  { href: '/home', label: 'Overview', icon: DashboardSquare01Icon },
  { href: '/home/widgets', label: 'Embed components', icon: CodeIcon },
  { href: '/home/quotes', label: 'Quote enquiries', icon: Mail01Icon },
  { href: '/home/settings', label: 'Settings', icon: Settings01Icon },
];
const subscribeTheme = (notify: () => void) => { window.addEventListener('storage', notify); window.addEventListener('frontage-theme', notify); return () => { window.removeEventListener('storage', notify); window.removeEventListener('frontage-theme', notify); }; };
const readTheme = () => { try { return localStorage.getItem('frontage-theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; } };
const subscribeMobile = (notify: () => void) => { const media=window.matchMedia('(max-width:860px)'); media.addEventListener('change',notify); return ()=>media.removeEventListener('change',notify); };
export function PortalShell({ name, email, signOut, children }: { name: string; email: string; signOut: () => Promise<void>; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const theme = useSyncExternalStore(subscribeTheme,readTheme,()=> 'light');
  const mobile=useSyncExternalStore(subscribeMobile,()=>window.matchMedia('(max-width:860px)').matches,()=>false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const active = links.find(l => l.href === '/home' ? pathname === l.href : pathname.startsWith(l.href));
  function toggleTheme() {
    const style = document.createElement('style');
    style.textContent = '*,*::before,*::after{transition:none !important}'; document.head.appendChild(style);
    const next = theme === 'light' ? 'dark' : 'light'; try { localStorage.setItem('frontage-theme', next); } catch {} window.dispatchEvent(new Event('frontage-theme'));
    document.documentElement.getBoundingClientRect(); requestAnimationFrame(() => requestAnimationFrame(() => style.remove()));
  }
  return <div className={s.app} data-theme={theme} data-admin-app>
    <a href="#main-content" className={s.skipLink}>Skip to content</a>
    <aside className={s.side} data-open={open || undefined} id="portal-navigation" inert={mobile && !open} onKeyDown={e => { if(e.key === 'Escape') { setOpen(false); menuButton.current?.focus(); } }}>
      <Link href="/home" className={s.brand}><span className={s.brandMark}>f</span><span><strong>Frontage</strong><small>Your customer portal</small></span></Link>
      <button type="button" className={`${s.iconBtn} ${s.mobileMenu}`} aria-label="Close menu" onClick={()=>{setOpen(false);menuButton.current?.focus();}}><Icon icon={Cancel01Icon}/></button><div className={s.navGroup}>Workspace</div>
      <nav className={s.nav} aria-label="Main navigation">{links.map(link => <Link key={link.href} href={link.href} className={s.navLink} onClick={()=>setOpen(false)} data-active={active?.href === link.href || undefined} aria-current={active?.href === link.href ? 'page' : undefined}><Icon icon={link.icon} />{link.label}</Link>)}</nav>
      <div className={s.sideFoot}><span className={s.avatar}>{(name || email || 'F').slice(0,2).toUpperCase()}</span><div className={s.account}><strong>{name || 'Your account'}</strong><small>{email}</small></div><form action={signOut}><button className={s.iconBtn} aria-label="Sign out" data-test="portal-sign-out"><Icon icon={Logout01Icon}/></button></form></div>
    </aside>
    <div className={s.work}><header className={s.topbar}><div className={s.topActions}><button ref={menuButton} type="button" className={`${s.iconBtn} ${s.mobileMenu}`} aria-label={open ? 'Close menu' : 'Open menu'} aria-controls="portal-navigation" aria-expanded={open} onClick={() => setOpen(!open)}><Icon icon={open ? Cancel01Icon : Menu01Icon}/></button><div className={s.breadcrumb}>Workspace <span aria-hidden="true">/</span><strong>{active?.label || 'Portal'}</strong></div></div><div className={s.topActions}><span className={s.badge}>Customer portal</span><button type="button" className={s.iconBtn} onClick={toggleTheme} aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}><Icon icon={theme === 'light' ? Moon02Icon : Sun01Icon}/></button></div></header>
    <main id="main-content" className={s.main}>{children}</main></div>
  </div>;
}
