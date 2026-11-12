'use client';
import { useTransition, useState, useRef } from 'react';
import { createUserAction } from '@/server/admin/actions';
import s from '@/components/portal/portal.module.css';

export function CreateUserDialog({ onCreated }: { onCreated?: () => void }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  function openDialog() {
    setMessage('');
    setIsError(false);
    requestAnimationFrame(() => dialogRef.current?.showModal());
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    setMessage('');
    setIsError(false);

    startTransition(async () => {
      try {
        const result = await createUserAction({
          email: String(data.get('email') ?? ''),
          password: String(data.get('password') ?? ''),
          name: String(data.get('name') ?? ''),
        });

        if (!result.ok) {
          setIsError(true);
          setMessage(result.error);
          return;
        }

        setMessage('User created successfully. They can now sign in with the provided credentials.');
        setIsError(false);
        form.reset();
        onCreated?.();
      } catch {
        setIsError(true);
        setMessage('Something went wrong. Please try again.');
      }
    });
  }

  return (
    <>
      <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={openDialog}>
        Create user
      </button>

      <dialog
        ref={dialogRef}
        className={s.adminDialog}
        onClick={e => { if (e.target === dialogRef.current) closeDialog(); }}
      >
        <div className={s.adminDialogInner}>
          <header className={s.adminDialogHead}>
            <h2 className={s.cardTitle}>Create new user</h2>
            <button type="button" className={s.iconBtn} aria-label="Close dialog" onClick={closeDialog}>
              ✕
            </button>
          </header>

          <form onSubmit={handleSubmit} noValidate>
            <div className={s.field}>
              <label className={s.label} htmlFor="cu-name">Full name</label>
              <input className={s.input} id="cu-name" name="name" required maxLength={80} placeholder="e.g. Acme Windows Ltd" />
            </div>

            <div className={s.field}>
              <label className={s.label} htmlFor="cu-email">Email address</label>
              <input className={s.input} id="cu-email" name="email" type="email" required placeholder="user@example.com" />
            </div>

            <div className={s.field}>
              <label className={s.label} htmlFor="cu-password">
                Temporary password
                <span className={s.hint}> (min. 8 characters)</span>
              </label>
              <input className={s.input} id="cu-password" name="password" type="password" required minLength={8} placeholder="••••••••" />
              <span className={s.hint}>The user can change this after signing in.</span>
            </div>

            {message && (
              <p className={s.notice} data-error={isError || undefined} role="status">
                {message}
              </p>
            )}

            <div className={s.actions}>
              <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={pending}>
                {pending ? 'Creating…' : 'Create user'}
              </button>
              <button type="button" className={s.btn} onClick={closeDialog}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
