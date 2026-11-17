'use client';
import { useSyncExternalStore, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { DashboardSquare01Icon, CodeIcon, Mail01Icon, Settings01Icon, Menu01Icon, Moon02Icon, Sun01Icon, Logout01Icon, Cancel01Icon, UserMultiple02Icon, ChartAverageIcon, ArtboardIcon } from '@hugeicons/core-free-icons';
import { Icon } from './icon';
import s from './portal.module.css';
const links = [
  { href: '/home', label: 'Overview', icon: DashboardSquare01Icon },
  { href: '/home/designer', label: 'Designer', icon: ArtboardIcon },
  { href: '/home/widgets', label: 'Embed components', icon: CodeIcon },
  { href: '/home/quotes', label: 'Quote enquiries', icon: Mail01Icon },
  { href: '/home/settings', label: 'Settings', icon: Settings01Icon },
];
const adminLinks = [
  { href: '/home/admin', label: 'Admin overview', icon: ChartAverageIcon },
  { href: '/home/admin/users', label: 'All users', icon: UserMultiple02Icon },
];
const subscribeTheme = (notify: () => void) => { window.addEventListener('storage', notify); window.addEventListener('frontage-theme', notify); return () => { window.removeEventListener('storage', notify); window.removeEventListener('frontage-theme', notify); }; };
const readTheme = () => { try { return localStorage.getItem('frontage-theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; } };
const subscribeMobile = (notify: () => void) => { const media=window.matchMedia('(max-width:860px)'); media.addEventListener('change',notify); return ()=>media.removeEventListener('change',notify); };
export function PortalShell({ name, email, role = 'user', signOut, children }: { name: string; email: string; role?: string; signOut: () => Promise<void>; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const theme = useSyncExternalStore(subscribeTheme,readTheme,()=>'light');
  const mobile=useSyncExternalStore(subscribeMobile,()=>window.matchMedia('(max-width:860px)').matches,()=>false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const active = links.find(l => l.href === '/home' ? pathname === l.href : pathname.startsWith(l.href));
  function toggleTheme() {
    const style = document.createElement('style');
    style.textContent = '*,*::before,*::after{transition:none !important}'; document.head.appendChild(style);
    const next = theme === 'light' ? 'dark' : 'light'; try { localStorage.setItem('frontage-theme', next); } catch {} window.dispatchEvent(new Event('frontage-theme'));
    document.documentElement.getBoundingClientRect(); requestAnimationFrame(() => requestAnimationFrame(() => style.remove()));
  }
  const isAdminActive = adminLinks.find(l => l.href === '/home/admin' ? pathname === '/home/admin' : pathname.startsWith(l.href));
  const breadcrumbLabel = role === 'admin' && isAdminActive
    ? isAdminActive.label
    : active?.label || 'Portal';
  const breadcrumbSection = role === 'admin' && isAdminActive ? 'Admin' : 'Workspace';
  return <div className={s.app} data-theme={theme} data-admin-app>
    <a href="#main-content" className={s.skipLink}>Skip to content</a>
    <aside className={s.side} data-open={open || undefined} id="portal-navigation" inert={mobile && !open} onKeyDown={e => { if(e.key === 'Escape') { setOpen(false); menuButton.current?.focus(); } }}>
      <Link href="/home" className={s.brand}><span className={s.brandMark}><img src="/brand/vistara-mark.webp" alt="" width={32} height={30} /></span><span><strong>Vistara</strong><small>Window &amp; Door Designer</small></span></Link>
      <button type="button" className={`${s.iconBtn} ${s.mobileMenu}`} aria-label="Close menu" onClick={()=>{setOpen(false);menuButton.current?.focus();}}><Icon icon={Cancel01Icon}/></button><div className={s.navGroup}>Workspace</div>
      <nav className={s.nav} aria-label="Main navigation">{links.map(link => <Link key={link.href} href={link.href} className={s.navLink} onClick={()=>setOpen(false)} data-active={active?.href === link.href || undefined} aria-current={active?.href === link.href ? 'page' : undefined}><Icon icon={link.icon} />{link.label}</Link>)}</nav>
      {role === 'admin' && (<>
        <div className={s.navGroup}>Admin</div>
        <nav className={s.nav} aria-label="Admin navigation">
          {adminLinks.map(link => {
            const isActive = link.href === '/home/admin' ? pathname === '/home/admin' : pathname.startsWith(link.href);
            return <Link key={link.href} href={link.href} className={s.navLink} onClick={()=>setOpen(false)} data-active={isActive || undefined} aria-current={isActive ? 'page' : undefined}><Icon icon={link.icon} />{link.label}</Link>;
          })}
        </nav>
      </>)}
      <div className={s.sideFoot}><span className={s.avatar}>{(name || email || 'V').slice(0,2).toUpperCase()}</span><div className={s.account}><strong>{name || 'Your account'}</strong><small>{email}</small></div><form action={signOut}><button className={s.iconBtn} aria-label="Sign out" data-test="portal-sign-out"><Icon icon={Logout01Icon}/></button></form></div>
    </aside>
    <div className={s.work}><header className={s.topbar}><div className={s.topActions}><button ref={menuButton} type="button" className={`${s.iconBtn} ${s.mobileMenu}`} aria-label={open ? 'Close menu' : 'Open menu'} aria-controls="portal-navigation" aria-expanded={open} onClick={() => setOpen(!open)}><Icon icon={open ? Cancel01Icon : Menu01Icon}/></button><div className={s.breadcrumb}>{breadcrumbSection} <span aria-hidden="true">/</span><strong>{breadcrumbLabel}</strong></div></div><div className={s.topActions}><span className={s.badge}>{role === 'admin' ? 'Admin' : 'Customer portal'}</span><button type="button" className={s.iconBtn} onClick={toggleTheme} aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}><Icon icon={theme === 'light' ? Moon02Icon : Sun01Icon}/></button></div></header>
    <main id="main-content" className={s.main}>{children}</main></div>
  </div>;
}
