"use client";

import { Button } from "@/components/ui/button";

import s from "@/components/portal/portal.module.css";

export default function PortalError({ reset }: { reset: () => void }) {
  return (
    <section className={s.empty}>
      <h2>We couldn’t load this page</h2>
      <p>Your changes may have been saved. Try loading the page again.</p>
      <Button type="button" variant="outline" size="sm" onClick={reset}>
        Try again
      </Button>
    </section>
  );
}
