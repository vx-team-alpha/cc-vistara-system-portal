import React from "react";

import { cn } from "@/lib/utils";

export function LiveIndicator({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex size-3", className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex size-3 rounded-full bg-green-500" />
    </span>
  );
}

export default LiveIndicator;
