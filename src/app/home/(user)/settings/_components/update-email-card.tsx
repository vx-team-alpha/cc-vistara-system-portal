"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { updateEmailAction } from "@/server/settings";
import { UpdateEmailSchema } from "@/server/settings/schemas";

type Values = z.infer<typeof UpdateEmailSchema>;

export function UpdateEmailCard({ currentEmail }: { currentEmail: string }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(UpdateEmailSchema),
    defaultValues: { email: currentEmail },
  });

  const onSubmit = (values: Values) => {
    setStatus(null);

    startTransition(async () => {
      try {
        const res = await updateEmailAction(values);

        if (!res.ok) {
          if (res.field === "email") {
            setError("email", { message: res.error });
          } else {
            setStatus(res.error);
          }
          return;
        }

        setPendingConfirmation(true);
      } catch {
        setStatus("Something went wrong. Please try again.");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email</CardTitle>
        <CardDescription>
          {/* double_confirm_changes in supabase/config.toml — see updateEmailAction */}
          Changing your email requires confirming the link sent to both your current and new
          address.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {pendingConfirmation ? (
          <div className="flex items-start gap-2 text-sm" role="status">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p>Check both your current and new inbox for confirmation links.</p>
          </div>
        ) : (
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

              <Button type="submit" disabled={isPending || !isDirty} className="w-fit">
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Update email
              </Button>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
