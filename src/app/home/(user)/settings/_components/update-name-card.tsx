"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { updateNameAction } from "@/server/settings";
import { UpdateNameSchema } from "@/server/settings/schemas";

type Values = z.infer<typeof UpdateNameSchema>;

/**
 * Each module on the settings page is independently protected: this form
 * calls `updateNameAction`, which is wrapped in `authAction` and re-verifies
 * the session server-side on every submit, regardless of the page-level gate
 * in `src/proxy.ts`.
 */
export function UpdateNameCard({ initialName }: { initialName: string }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(UpdateNameSchema),
    defaultValues: { name: initialName },
  });

  const onSubmit = (values: Values) => {
    setStatus(null);

    startTransition(async () => {
      try {
        const res = await updateNameAction(values);

        if (!res.ok) {
          setStatus({ tone: "error", message: res.error });
          return;
        }

        setStatus({ tone: "success", message: "Name updated." });
      } catch {
        setStatus({ tone: "error", message: "Something went wrong. Please try again." });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Name</CardTitle>
        <CardDescription>This is the name shown across your account.</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                autoComplete="name"
                aria-invalid={!!errors.name}
                className="w-full max-w-md"
                {...register("name")}
              />
              <FieldError errors={[errors.name]} />
            </Field>

            {status ? (
              <p
                role="status"
                className={
                  status.tone === "error"
                    ? "text-sm text-destructive"
                    : "text-sm text-muted-foreground"
                }
              >
                {status.message}
              </p>
            ) : null}

            <Button type="submit" size="sm" disabled={isPending || !isDirty} className="w-fit">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
