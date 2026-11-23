"use client";
import s from "@/components/portal/portal.module.css";
export default function PortalError({ reset }: { reset: () => void }) {
  return (
    <section className={s.empty}>
      <h2>We couldn’t load this page</h2>
      <p>Your changes may have been saved. Try loading the page again.</p>
      <button type="button" className={s.btn} onClick={reset}>
        Try again
      </button>
    </section>
  );
}
