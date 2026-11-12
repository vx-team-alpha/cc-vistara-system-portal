'use client';
import { useTransition, useState } from 'react';
import { updateRoleAction } from '@/server/admin/actions';
import s from '@/components/portal/portal.module.css';

type Role = 'admin' | 'user';

export function RoleSelect({
  targetId,
  currentRole,
  isSelf,
}: {
  targetId: string;
  currentRole: string;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState<Role>(currentRole as Role);
  const [error, setError] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as Role;
    setError('');

    startTransition(async () => {
      try {
        const result = await updateRoleAction({ targetId, role: newRole });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setRole(newRole);
      } catch {
        setError('Failed to update role.');
      }
    });
  }

  if (isSelf) {
    return (
      <span className={s.badge} data-state={role} title="You cannot change your own role">
        {role} (you)
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <select
        className={s.select}
        value={role}
        onChange={handleChange}
        disabled={pending}
        style={{ width: 'auto', minWidth: 90 }}
        aria-label="Change user role"
      >
        <option value="user">user</option>
        <option value="admin">admin</option>
      </select>
      {error && <small style={{ color: 'var(--bad)' }}>{error}</small>}
    </div>
  );
}
