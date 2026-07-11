"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { verifyMfaAction } from "@/server/auth";
import { VerifyMfaSchema } from "@/server/auth/schemas";

type Values = z.infer<typeof VerifyMfaSchema>;

export function VerifyForm({ factorId, next }: { factorId: string; next: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    resetField,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(VerifyMfaSchema),
    defaultValues: { factorId, code: "" },
  });

  const onSubmit = (values: Values) => {
    setStatus(null);

    startTransition(async () => {
      try {
        const res = await verifyMfaAction(values);

        if (!res.ok) {
          if (res.field === "code") {
            setError("code", { message: res.error });
          } else {
            setStatus(res.error);
          }
          // A TOTP code is single-use and rotates every 30s, so a failed one is
          // never worth resubmitting. Clear it so the user types the current one.
          resetField("code");
          return;
        }

        // The session is now aal2. refresh() makes the server re-read the
        // upgraded cookie before the destination renders.
        router.push(next);
        router.refresh();
      } catch {
        setStatus("Something went wrong. Please try again.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.code}>
          <FieldLabel htmlFor="code">Authentication code</FieldLabel>

          {/* InputOTP is not a native input — it uses value/onChange, so a
              {...register()} spread would silently never reach form state.
              Controller is required here. */}
          <Controller
            control={control}
            name="code"
            render={({ field }) => (
              <InputOTP
                id="code"
                maxLength={6}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                containerClassName="justify-center"
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} aria-invalid={!!errors.code} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            )}
          />

          <FieldError errors={[errors.code]} />
        </Field>

        {status ? (
          <p role="status" className="text-sm text-destructive">
            {status}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Verify
        </Button>
      </FieldGroup>
    </form>
  );
}
