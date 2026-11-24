import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-brand-accent1 text-brand-accent2 hover:bg-brand-accent1/90",
        primary: "border-transparent bg-brand-accent1 text-brand-accent2 hover:bg-brand-accent1/90",
        secondary:
          "border-transparent bg-brand-accent3 text-brand-txt-primary hover:bg-brand-accent3/80",
        lime: "border-transparent bg-brand-accent2 font-bold text-brand-accent1",
        success: "border-transparent bg-[#e8f8ed] font-medium text-[#0d7555]",
        warning: "border-transparent bg-[#fef6e7] font-medium text-[#b45309]",
        destructive: "border-transparent bg-brand-accent4/10 font-medium text-brand-accent4",
        blue: "border-transparent bg-brand-accent5/10 font-medium text-brand-accent5",
        lemon: "border-transparent bg-brand-accent6 font-medium text-brand-accent1",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

function Badge({ className, variant = "default", asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot.Root : "div";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
