"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUserAction } from "@/server/admin/actions";

export function CreateUserDialog({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    setMessage("");
    setIsError(false);

    startTransition(async () => {
      try {
        const result = await createUserAction({
          email: String(data.get("email") ?? ""),
          password: String(data.get("password") ?? ""),
          name: String(data.get("name") ?? ""),
        });

        if (!result.ok) {
          setIsError(true);
          setMessage(result.error);
          return;
        }

        setMessage(
          "User created successfully. They can now sign in with the provided credentials.",
        );
        setIsError(false);
        form.reset();
        onCreated?.();
      } catch {
        setIsError(true);
        setMessage("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary" size="sm" className="gap-1.5">
          <Plus className="size-4" />
          <span>Create user</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-h3 font-bold text-brand-txt-primary">
            Create new user
          </DialogTitle>
          <DialogDescription className="text-subtitle text-brand-txt-secondary">
            Create a new portal user with email and password credentials.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="cu-name" className="text-subtitle font-medium text-brand-txt-primary">
              Full name
            </Label>
            <Input
              id="cu-name"
              name="name"
              required
              maxLength={80}
              placeholder="e.g. Acme Windows Ltd"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cu-email" className="text-subtitle font-medium text-brand-txt-primary">
              Email address
            </Label>
            <Input
              id="cu-email"
              name="email"
              type="email"
              required
              placeholder="user@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="cu-password"
              className="text-subtitle font-medium text-brand-txt-primary"
            >
              Temporary password <span className="text-muted-foreground">(min. 8 characters)</span>
            </Label>
            <Input
              id="cu-password"
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
            />
            <p className="text-xs text-muted-foreground">
              The user can change this after signing in.
            </p>
          </div>

          {message && (
            <p
              className={`text-subtitle ${isError ? "text-destructive" : "text-success"}`}
              role="status"
            >
              {message}
            </p>
          )}

          <DialogFooter className="gap-2 pt-2 sm:gap-0">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" variant="primary" size="sm" disabled={pending}>
              {pending ? "Creating…" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
