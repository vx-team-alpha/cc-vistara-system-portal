"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/cusotm/password-input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { updatePasswordAction } from "@/server/auth";
import { MIN_PASSWORD_LENGTH, UpdatePasswordSchema } from "@/server/auth/schemas";

type Values = z.infer<typeof UpdatePasswordSchema>;

/**
 * Reuses `updatePasswordAction` from `@/server/auth` (public action, plain
 * `"use server"`) rather than duplicating it under `@/server/settings` —
 * `supabase.auth.updateUser({ password })` needs only the caller's existing
 * session, which this form already has, same as the password-reset flow.
 */
export function UpdatePasswordCard() {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(UpdatePasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = (values: Values) => {
    setStatus(null);

    startTransition(async () => {
      try {
        const res = await updatePasswordAction(values);

        if (!res.ok) {
          if (res.field === "password") {
            setError("password", { message: res.error });
          } else {
            setStatus(res.error);
          }
          return;
        }

        reset();
        setStatus("Password updated.");
      } catch {
        setStatus("Something went wrong. Please try again.");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>At least {MIN_PASSWORD_LENGTH} characters.</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="password">New password</FieldLabel>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              <FieldError errors={[errors.password]} />
            </Field>

            <Field data-invalid={!!errors.confirmPassword}>
              <FieldLabel htmlFor="confirmPassword">Confirm new password</FieldLabel>
              <PasswordInput
                id="confirmPassword"
                autoComplete="new-password"
                aria-invalid={!!errors.confirmPassword}
                {...register("confirmPassword")}
              />
              <FieldError errors={[errors.confirmPassword]} />
            </Field>

            {status ? (
              <p role="status" className="text-sm text-muted-foreground">
                {status}
              </p>
            ) : null}

            <Button type="submit" size="sm" disabled={isPending} className="w-fit">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Update password
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
