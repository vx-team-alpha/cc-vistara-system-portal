import React from "react";

import { cn } from "@/lib/utils";

export function LiveIndicator({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex size-3", className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-50" />
      <span className="relative inline-flex size-3 rounded-full bg-success" />
    </span>
  );
}

export default LiveIndicator;
