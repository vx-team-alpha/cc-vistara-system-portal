import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { resolveAuthContext } from '@/server/auth-wrapper/context';
import { UnauthorizedError } from '@/server/auth-wrapper/errors';
export const portalContext = cache(async () => {
  try { return await resolveAuthContext(); }
  catch (error) { if (error instanceof UnauthorizedError) redirect('/auth/sign-in?next=%2Fhome'); throw error; }
});
export async function getWidgets() {
  const { supabase } = await portalContext();
  const { data, error } = await supabase.from('embed_widgets').select('*, configurator_types(slug,label)').order('created_at', { ascending: false });
  if(error) throw new Error('Could not load embed components.');
  return data;
}
export async function getStats() {
  const { supabase } = await portalContext();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const result = await Promise.all([
    supabase.from('widget_views').select('id', { count: 'exact', head: true }).gte('created_at', since),
    supabase.from('leads').select('id', { count: 'exact', head: true }).not('widget_id','is',null).gte('created_at', since),
    supabase.from('embed_widgets').select('id', { count: 'exact', head: true }).eq('enabled', true),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'new'),
  ]);
  if(result.some(r => r.error)) throw new Error('Could not load portal statistics.');
  return { views: result[0].count || 0, quotes: result[1].count || 0, active: result[2].count || 0, pending: result[3].count || 0 };
}
export async function getRecentQuotes() {
  const { supabase } = await portalContext();
  const { data, error } = await supabase.from('leads').select('id,name,email,status,created_at,embed_widgets(name)').order('created_at', { ascending:false }).limit(5);
  if(error) throw new Error('Could not load recent enquiries.'); return data;
}
