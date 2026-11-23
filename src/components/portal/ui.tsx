import type { ReactNode } from "react";

import s from "./portal.module.css";
export { default as portalStyles } from "./portal.module.css";
export function PageHead({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children?: ReactNode;
}) {
  return (
    <header className={s.pageHead}>
      <div>
        <h1 className={s.title}>{title}</h1>
        {note && <p className={s.note}>{note}</p>}
      </div>
      {children}
    </header>
  );
}
export function Card({
  title,
  note,
  actions,
  children,
  flush = false,
}: {
  title: string;
  note?: string;
  actions?: ReactNode;
  children: ReactNode;
  flush?: boolean;
}) {
  return (
    <section className={s.card}>
      <header className={s.cardHead}>
        <div>
          <h2 className={s.cardTitle}>{title}</h2>
          {note && <p className={s.cardNote}>{note}</p>}
        </div>
        {actions}
      </header>
      <div className={flush ? undefined : s.cardBody}>{children}</div>
    </section>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={s.empty}>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Badge({ state, children }: { state: string; children: ReactNode }) {
  return (
    <span className={s.badge} data-state={state}>
      {children}
    </span>
  );
}
export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}
