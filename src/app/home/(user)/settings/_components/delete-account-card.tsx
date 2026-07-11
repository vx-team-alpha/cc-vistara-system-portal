"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const CONFIRM_PHRASE = "delete my account";

/**
 * Calls the `POST /home/settings/delete-account` Route Handler rather than a
 * Server Action — see that route's file comment for why this needs the
 * service-role client and can't go through `authAction`.
 *
 * Gated by a type-to-confirm phrase rather than a dialog component (none
 * exists in `@/components/ui` yet) — same intent as a confirm modal, fewer
 * new dependencies for one destructive button.
 */
export function DeleteAccountCard() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = confirmText.trim().toLowerCase() === CONFIRM_PHRASE;

  const onDelete = () => {
    if (!canSubmit) return;
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch("/home/settings/delete-account", { method: "POST" });
        const body = (await res.json()) as { success: boolean; message?: string };

        if (!res.ok || !body.success) {
          setError(body.message ?? "Could not delete your account. Please try again.");
          return;
        }

        router.push("/");
        router.refresh();
      } catch {
        setError("Could not delete your account. Please try again.");
      }
    });
  };

  return (
    <Card className="ring-destructive/30">
      <CardHeader>
        <CardTitle>Delete account</CardTitle>
        <CardDescription>
          Permanently deletes your account and all associated data. This cannot be undone.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-3">
        <Field>
          <FieldLabel htmlFor="delete-confirm">
            Type <span className="font-mono font-medium">{CONFIRM_PHRASE}</span> to confirm
          </FieldLabel>
          <Input
            id="delete-confirm"
            autoComplete="off"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
        </Field>

        {error ? (
          <p role="status" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button
          type="button"
          variant="destructive"
          disabled={!canSubmit || isPending}
          className="w-fit"
          onClick={onDelete}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Delete my account
        </Button>
      </CardContent>
    </Card>
  );
}
