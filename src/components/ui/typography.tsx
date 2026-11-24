import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

const typographyVariants = cva("", {
  variants: {
    variant: {
      default: "",
      p: "",
      h1: "text-h1 scroll-m-20 font-bold",
      h2: "text-h2 scroll-m-20 font-bold",
      h3: "text-h3 scroll-m-20 font-bold",
      h4: "text-h4 scroll-m-20 font-semibold",
      h5: "text-h4 scroll-m-10 font-medium",
      lead: "text-xl text-muted-foreground",
      large: "text-lg font-semibold",
      small: "text-sm leading-none font-medium",
      muted: "text-sm text-brand-txt-secondary",
    },
    size: {
      default: "",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

const variantComp: Record<string, React.ElementType> = {
  default: "p",
  p: "p",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  large: "div",
  small: "small",
  muted: "p",
  lead: "p",
};

export interface TypographyProps
  extends
    React.HTMLAttributes<HTMLHeadingElement | HTMLParagraphElement | HTMLDivElement>,
    VariantProps<typeof typographyVariants> {
  asChild?: boolean;
}

const Typography = React.forwardRef<
  HTMLHeadingElement | HTMLParagraphElement | HTMLDivElement,
  TypographyProps
>(({ className, variant = "default", size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot.Root : variantComp[variant || "default"] || "p";
  return (
    <Comp ref={ref} className={cn(typographyVariants({ variant, size, className }))} {...props} />
  );
});
Typography.displayName = "Typography";

export default Typography;
export { Typography, typographyVariants };
