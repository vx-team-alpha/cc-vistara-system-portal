"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { requestPasswordResetAction } from "@/server/auth";
import { RequestPasswordResetSchema } from "@/server/auth/schemas";

type Values = z.infer<typeof RequestPasswordResetSchema>;

export function PasswordResetForm() {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(RequestPasswordResetSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (values: Values) => {
    setStatus(null);

    startTransition(async () => {
      try {
        const res = await requestPasswordResetAction(values);

        if (!res.ok) {
          setStatus(res.error);
          return;
        }

        setSent(true);
      } catch {
        setStatus("Something went wrong. Please try again.");
      }
    });
  };

  if (sent) {
    return (
      <div className="grid gap-3 text-center" role="status">
        <MailCheck className="mx-auto size-8 text-muted-foreground" />
        {/* Deliberately does not confirm the address exists — the action always
            reports success for the same reason. Saying "we couldn't find that
            account" would let anyone probe which emails are registered. */}
        <p className="text-sm">
          If an account exists for that address, we&apos;ve sent a link to reset the password.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
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
          Send reset link
        </Button>
      </FieldGroup>
    </form>
  );
}
