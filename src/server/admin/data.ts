import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { portalContext } from '@/server/portal/data';

/**
 * Loads the portal context, then asserts the caller is an admin.
 * Reads role from accounts table (cached) — source of truth for permissions.
 */
export const adminContext = cache(async () => {
  const ctx = await portalContext();
  if (ctx.account.role !== 'admin') {
    redirect('/home');
  }
  return ctx;
});

export type AdminAccount = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  created_at: string;
};

/** Platform-wide totals for the admin overview. */
export async function getAdminStats() {
  await adminContext();
  const admin = getSupabaseAdminClient();

  const [accounts, widgets, leads, views] = await Promise.all([
    admin.from('accounts').select('id', { count: 'exact', head: true }),
    admin.from('embed_widgets').select('id', { count: 'exact', head: true }),
    admin.from('leads').select('id', { count: 'exact', head: true }),
    admin.from('widget_views').select('id', { count: 'exact', head: true }),
  ]);

  return {
    totalAccounts: accounts.count ?? 0,
    totalWidgets: widgets.count ?? 0,
    totalLeads: leads.count ?? 0,
    totalViews: views.count ?? 0,
  };
}

/** All registered accounts ordered by newest first. */
export async function getAllAccounts(): Promise<AdminAccount[]> {
  await adminContext();
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('accounts')
    .select('id, name, email, role, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error('Could not load accounts.');
  return data as AdminAccount[];
}

/** Per-account stats for the admin breakdown table. */
export async function getAccountStats(accountId: string) {
  await adminContext();
  const admin = getSupabaseAdminClient();

  const [widgets, leads, views] = await Promise.all([
    admin.from('embed_widgets').select('id', { count: 'exact', head: true }).eq('account_id', accountId),
    admin.from('leads').select('id', { count: 'exact', head: true }).eq('account_id', accountId),
    admin.from('widget_views').select('id', { count: 'exact', head: true }).eq('account_id', accountId),
  ]);

  return {
    widgets: widgets.count ?? 0,
    leads: leads.count ?? 0,
    views: views.count ?? 0,
  };
}
