"use client";

import { Button } from "@/components/ui/button";

export default function PortalError({ reset }: { reset: () => void }) {
  return (
    <section className="flex flex-col items-center justify-center p-12 text-center">
      <h2 className="text-xl font-bold text-brand-txt-primary">We couldn’t load this page</h2>
      <p className="mt-1 mb-6 text-sm text-brand-txt-secondary">
        Your changes may have been saved. Try loading the page again.
      </p>
      <Button type="button" variant="outline" size="sm" onClick={reset}>
        Try again
      </Button>
    </section>
  );
}
