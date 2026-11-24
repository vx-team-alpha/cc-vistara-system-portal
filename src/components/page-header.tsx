import React from "react";

import Typography from "@/components/ui/typography";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <Typography
          variant="h1"
          className="text-h1 font-bold tracking-tight text-brand-txt-primary"
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography className="text-body text-brand-txt-secondary">{subtitle}</Typography>
        )}
      </div>
      {children && <div className="flex shrink-0 items-center gap-3">{children}</div>}
    </div>
  );
}

export default PageHeader;
