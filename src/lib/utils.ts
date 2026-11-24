import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "text-color": [
        "text-brand-accent0",
        "text-brand-accent1",
        "text-brand-accent2",
        "text-brand-accent3",
        "text-brand-accent4",
        "text-brand-accent5",
        "text-brand-accent6",
        "text-brand-accent7",
        "text-brand-txt-primary",
        "text-brand-txt-secondary",
        "text-brand-backgroundMain",
        "text-brand-backgroundSecondary",
      ],
      "font-size": [
        "text-xxs",
        "text-action-sm",
        "text-action-md",
        "text-action-lg",
        "text-title-1",
        "text-title-2",
        "text-h1",
        "text-h2",
        "text-h3",
        "text-h4",
        "text-lg-input",
        "text-input",
        "text-lg-body",
        "text-body-bold",
        "text-body",
        "text-subtitle",
        "text-caption",
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs));
}
