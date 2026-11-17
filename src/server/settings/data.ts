import 'server-only';
import { unstable_cache } from 'next/cache';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { portalContext } from '@/server/portal/data';

const cachedIdentities = unstable_cache(async (userId: string) => {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) throw new Error('Could not load connected accounts.');
  return data.user.identities || [];
}, ['settings-identities'], { revalidate: 300, tags: ['settings-data'] });

export async function getSettingsData() {
  const { account, user } = await portalContext();
  const identities = await cachedIdentities(user.id);
  return { account, user, identities };
}
