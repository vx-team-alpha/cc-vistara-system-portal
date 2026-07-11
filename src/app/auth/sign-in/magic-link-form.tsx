"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck } from "lucide-react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signInWithMagicLinkAction } from "@/server/auth";
import { MagicLinkSchema } from "@/server/auth/schemas";

type Values = z.infer<typeof MagicLinkSchema>;

export function MagicLinkForm({ next }: { next?: string }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(MagicLinkSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (values: Values) => {
    setStatus(null);

    startTransition(async () => {
      try {
        const res = await signInWithMagicLinkAction(values, next);

        if (!res.ok) {
          setStatus(res.error);
          return;
        }

        setSentTo(values.email);
      } catch {
        setStatus("Something went wrong. Please try again.");
      }
    });
  };

  if (sentTo) {
    return (
      <div className="grid gap-3 text-center" role="status">
        <MailCheck className="mx-auto size-8 text-muted-foreground" />
        {/* Deliberately does not confirm the address exists — the action always
            reports success for the same reason password reset does. */}
        <p className="text-sm">
          If an account exists for <span className="font-medium">{sentTo}</span>, we&apos;ve
          sent a sign-in link. Follow it to continue.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="magic-link-email">Email</FieldLabel>
          <Input
            id="magic-link-email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          <FieldError errors={[errors.email]} />
        </Field>

        {status ? (
          <p role="status" className="text-sm text-destructive">
            {status}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Send magic link
        </Button>
      </FieldGroup>
    </form>
  );
}
