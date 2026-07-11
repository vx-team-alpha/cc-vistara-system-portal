"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck } from "lucide-react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/cusotm/password-input";
import { signUpAction } from "@/server/auth";
import { MIN_PASSWORD_LENGTH, SignUpSchema } from "@/server/auth/schemas";

type SignUpValues = z.infer<typeof SignUpSchema>;

export function SignUpForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = (values: SignUpValues) => {
    setStatus(null);

    startTransition(async () => {
      try {
        const res = await signUpAction(values);

        if (!res.ok) {
          if (res.field === "email") {
            setError("email", { message: res.error });
          } else {
            setStatus(res.error);
          }
          return;
        }

        // Which branch fires depends on `enable_confirmations` in
        // supabase/config.toml. It is currently false, so sign-up returns a
        // session and we go straight in. Flip it on and the same action returns
        // no session, and this renders "check your email" instead.
        if (res.data.needsEmailConfirmation || !res.data.redirectTo) {
          setSentTo(values.email);
          return;
        }

        router.push(res.data.redirectTo);
        router.refresh();
      } catch {
        setStatus("Something went wrong. Please try again.");
      }
    });
  };

  if (sentTo) {
    return (
      <div className="grid gap-3 text-center" role="status">
        <MailCheck className="mx-auto size-8 text-muted-foreground" />
        <p className="text-sm">
          We sent a confirmation link to <span className="font-medium">{sentTo}</span>. Follow
          it to finish signing up.
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

        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
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
          <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
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
          Create account
        </Button>
      </FieldGroup>
    </form>
  );
}
