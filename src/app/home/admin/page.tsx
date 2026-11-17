import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHead, Card, Badge, Empty, formatDate, portalStyles as s } from '@/components/portal/ui';
import { getAdminStats, getAllAccounts } from '@/server/admin/data';
import { UserMultiple02Icon, CodeIcon, Mail01Icon, ViewIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/portal/icon';

export const metadata: Metadata = { title: 'Admin Overview' };

export default async function AdminOverviewPage() {
  const [stats, accounts] = await Promise.all([getAdminStats(), getAllAccounts()]);

  const metrics = [
    { label: 'Total businesses', value: stats.totalAccounts.toLocaleString(), note: 'Registered accounts', icon: UserMultiple02Icon },
    { label: 'Embed components', value: stats.totalWidgets.toLocaleString(), note: 'Across all accounts', icon: CodeIcon },
    { label: 'All-time queries', value: stats.totalLeads.toLocaleString(), note: 'Quote submissions', icon: Mail01Icon },
    { label: 'All-time sessions', value: stats.totalViews.toLocaleString(), note: 'Widget impressions', icon: ViewIcon },
  ];

  return (
    <>
      <PageHead title="Admin overview" note="Platform-wide metrics and all registered businesses.">
        <Link href="/home/admin/users" className={`${s.btn} ${s.btnPrimary}`}>Manage users</Link>
      </PageHead>

      <div className={s.stats}>
        {metrics.map(m => (
          <section className={s.stat} key={m.label}>
            <h2 className={s.statLabel}><Icon icon={m.icon} />{m.label}</h2>
            <p className={s.statValue}>{m.value}</p>
            <small>{m.note}</small>
          </section>
        ))}
      </div>

      <div className={s.stack}>
        <Card title="All businesses" note={`${accounts.length} registered ${accounts.length === 1 ? 'account' : 'accounts'}`} flush>
          {accounts.length === 0 ? (
            <Empty title="No accounts yet">New businesses will appear here after registration.</Empty>
          ) : (
            <div className={s.tableScroll}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Business</th>
                    <th>Role</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(a => (
                    <tr key={a.id}>
                      <td>
                        <Link href={`/home/admin/users`}>{a.name}</Link>
                        <small>{a.email ?? '—'}</small>
                      </td>
                      <td><Badge state={a.role}>{a.role}</Badge></td>
                      <td>{formatDate(a.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
