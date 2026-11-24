import type { VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import { Badge as ShadcnBadge, type badgeVariants } from "@/components/ui/badge";
import {
  Card as ShadcnCard,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export function PageHead({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <Typography
          variant="h1"
          className="text-h1 font-bold tracking-tight text-brand-txt-primary"
        >
          {title}
        </Typography>
        {note && <Typography className="text-body text-brand-txt-secondary">{note}</Typography>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-3">{children}</div>}
    </header>
  );
}

export function Card({
  title,
  note,
  actions,
  children,
  flush = false,
  className,
}: {
  title: string;
  note?: string;
  actions?: ReactNode;
  children: ReactNode;
  flush?: boolean;
  className?: string;
}) {
  return (
    <ShadcnCard
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-xs",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 p-6">
        <div className="space-y-0.5">
          <CardTitle className="text-title-2 font-bold text-brand-txt-primary">{title}</CardTitle>
          {note && (
            <CardDescription className="text-subtitle text-brand-txt-secondary">
              {note}
            </CardDescription>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </CardHeader>
      <CardContent className={flush ? "p-0" : "p-6"}>{children}</CardContent>
    </ShadcnCard>
  );
}

export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <Typography variant="h3" className="text-title-2 mb-1 font-bold text-brand-txt-primary">
        {title}
      </Typography>
      <Typography className="text-body mb-6 max-w-md text-brand-txt-secondary">
        {children}
      </Typography>
      {action}
    </div>
  );
}

function getBadgeVariant(state?: string): BadgeVariant {
  if (!state) return "secondary";
  switch (state.toLowerCase()) {
    case "confirmed":
      return "lime";
    case "in_production":
    case "production":
      return "success";
    case "issued":
      return "blue";
    case "completed":
      return "primary";
    case "cancelled":
    case "rejected":
      return "destructive";
    case "draft":
    default:
      return "secondary";
  }
}

export function Badge({
  state,
  children,
  className,
}: {
  state?: string;
  children: ReactNode;
  className?: string;
}) {
  const variant = getBadgeVariant(state);
  return (
    <ShadcnBadge variant={variant} className={className}>
      {children}
    </ShadcnBadge>
  );
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function formatStatus(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
