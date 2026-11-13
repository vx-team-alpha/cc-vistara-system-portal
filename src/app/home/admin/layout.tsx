import type { Metadata } from 'next';
import { adminContext } from '@/server/admin/data';

export const metadata: Metadata = {
  title: { default: 'Admin · Vistara', template: '%s · Admin · Vistara' },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await adminContext();
  return <>{children}</>;
}
