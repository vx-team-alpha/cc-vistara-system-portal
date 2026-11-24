import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md font-medium transition-all select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:bg-brand-accent3 disabled:text-muted-foreground/40 disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-brand-accent1 font-semibold text-brand-accent2 hover:shadow-lg hover:ring-2 hover:ring-brand-accent1/20",
        primary:
          "bg-brand-accent1 font-semibold text-brand-accent2 hover:shadow-lg hover:ring-2 hover:ring-brand-accent1/20",
        secondary:
          "bg-brand-accent2 font-semibold text-brand-accent1 hover:ring-2 hover:ring-brand-accent2/40 hover:brightness-105",
        secondery:
          "bg-brand-accent2 font-semibold text-brand-accent1 hover:ring-2 hover:ring-brand-accent2/40 hover:brightness-105",
        light:
          "bg-brand-accent3 font-medium text-brand-txt-primary hover:!ring-0 hover:brightness-95",
        orange:
          "bg-brand-accent4 font-medium text-white hover:ring-2 hover:ring-brand-accent4/20 hover:brightness-95",
        transparent: "bg-transparent text-brand-accent0 hover:bg-brand-accent3/50",
        ghost: "hover:bg-muted hover:text-foreground hover:!ring-0",
        link: "h-auto p-0 text-brand-accent5 underline-offset-4 hover:underline",
        outline: "border border-input bg-background hover:bg-muted hover:text-foreground",
        tertiary:
          "border border-black/10 bg-white text-brand-txt-primary hover:bg-brand-backgroundSecondary",
        destructive:
          "bg-brand-accent4 text-white hover:bg-brand-accent4/90 focus-visible:ring-brand-accent4/30",
      },
      size: {
        default: "text-action-sm h-10 min-w-20 gap-2 px-4 py-2",
        md: "text-action-sm h-10 min-w-20 gap-2 px-4 py-2",
        sm: "text-action-sm h-[34px] min-w-16 gap-1.5 px-3 py-1.5",
        xs: "h-7 gap-1 px-2.5 py-1 text-xs",
        lg: "text-action-md h-12 gap-2.5 px-6 py-3",
        icon: "size-9 p-0",
        "icon-sm": "size-7 p-0",
        "icon-lg": "size-10 p-0",
        link: "h-auto min-w-0 p-0 text-brand-accent5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : "button";

    return (
      <Comp
        ref={ref}
        data-slot="button"
        data-variant={variant}
        data-size={size}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
