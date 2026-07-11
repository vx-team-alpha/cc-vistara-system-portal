"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Separate client component so it can read `useFormStatus`, which only reports
 * the pending state of a parent <form> from inside it.
 */
export function SignOutButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Sign out
    </Button>
  );
}
