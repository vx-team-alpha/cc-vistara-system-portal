import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

// Define button styles with variants matching cc-the-ladder-app
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-md font-medium transition-colors hover:ring-4 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-brand-accent1 text-brand-accent2 hover:shadow-lg hover:ring-brand-accent1/10",
        secondery:
          "bg-brand-accent2 text-brand-accent1 hover:ring-brand-accent2/40 hover:brightness-105",
        secondary:
          "bg-brand-accent2 text-brand-accent1 hover:ring-brand-accent2/40 hover:brightness-105",
        light: "bg-brand-accent3 text-brand-txt-primary hover:!ring-0 hover:brightness-95",
        orange: "bg-brand-accent4 text-white hover:ring-brand-accent4/20 hover:brightness-95",
        transparent: "bg-transparent text-brand-accent0 hover:bg-brand-accent3/50",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:!ring-0",
        link: "text-primary underline-offset-4 hover:underline",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        tertiary: "border border-black/5 bg-white text-brand-txt-primary",
        destructive: "bg-brand-accent4 text-white hover:brightness-95",
        default: "bg-brand-accent1 text-brand-accent2 hover:shadow-lg hover:ring-brand-accent1/10",
      },
      size: {
        sm: "text-action-sm h-[34px] min-w-16 px-3 py-2",
        md: "text-action-md h-11 min-w-24 px-5 py-3",
        lg: "text-action-lg h-14 w-full !max-w-[361px] px-5 py-4",
        icon: "size-10",
        link: "h-auto min-w-0 p-1 text-brand-accent5",
        default: "text-action-md h-11 min-w-24 px-5 py-3",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : "button";

    return (
      <Comp
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
