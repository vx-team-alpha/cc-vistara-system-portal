import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/shell';
import { portalContext } from '@/server/portal/data';
import { signOutAction } from '@/server/auth';
export const metadata: Metadata = { title: { default:'Overview · Frontage', template:'%s · Frontage' } };
export default async function HomeLayout({children}:{children:React.ReactNode}) {
  const {account,user}=await portalContext();
  async function signOut(){'use server'; await signOutAction(); redirect('/auth/sign-in');}
  return <PortalShell name={account.name || ''} email={user.email || ''} signOut={signOut}>{children}</PortalShell>;
}
