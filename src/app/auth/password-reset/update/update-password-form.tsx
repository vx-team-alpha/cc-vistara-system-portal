"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/cusotm/password-input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { updatePasswordAction } from "@/server/auth";
import { MIN_PASSWORD_LENGTH, UpdatePasswordSchema } from "@/server/auth/schemas";

type Values = z.infer<typeof UpdatePasswordSchema>;

export function UpdatePasswordForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
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

        setDone(true);
      } catch {
        setStatus("Something went wrong. Please try again.");
      }
    });
  };

  if (done) {
    return (
      <div className="grid gap-4 text-center" role="status">
        <CheckCircle2 className="mx-auto size-8 text-muted-foreground" />
        <p className="text-sm">Your password has been updated.</p>
        {/* The recovery link already signed this user in, so send them to the
            app rather than back to sign-in. refresh() makes the server re-read
            the session cookie. */}
        <Button
          onClick={() => {
            router.push("/home");
            router.refresh();
          }}
        >
          Continue
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">New password</FieldLabel>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            aria-describedby="password-hint"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          <p id="password-hint" className="text-xs text-muted-foreground">
            At least {MIN_PASSWORD_LENGTH} characters.
          </p>
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
          <p role="status" className="text-sm text-destructive">
            {status}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Update password
        </Button>
      </FieldGroup>
    </form>
  );
}
