import type { Metadata } from "next";

import { PageHead, Card, Empty, formatDate, portalStyles as s } from "@/components/portal/ui";
import { getAllAccounts, adminContext } from "@/server/admin/data";

import { CreateUserDialog } from "../_components/create-user-dialog";
import { RoleSelect } from "../_components/role-select";

export const metadata: Metadata = { title: "All Users" };

export default async function AdminUsersPage() {
  const [ctx, accounts] = await Promise.all([adminContext(), getAllAccounts()]);
  const currentUserId = ctx.user.id;

  return (
    <>
      <PageHead
        title="All users"
        note={`${accounts.length} registered ${accounts.length === 1 ? "account" : "accounts"} on the platform.`}
      >
        <CreateUserDialog />
      </PageHead>

      <div className={s.stack}>
        <Card
          title="Registered accounts"
          note="Only admins can edit the Role column. Admins cannot change their own role."
          flush
        >
          {accounts.length === 0 ? (
            <Empty title="No accounts yet">Create the first account to begin managing users.</Empty>
          ) : (
            <div className={s.tableScroll}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id}>
                      <td>
                        <strong className={s.cellTitle}>{account.name}</strong>
                        <small>{account.email ?? "—"}</small>
                      </td>
                      <td>
                        <RoleSelect
                          targetId={account.id}
                          currentRole={account.role}
                          isSelf={account.id === currentUserId}
                        />
                      </td>
                      <td>{formatDate(account.created_at)}</td>
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
