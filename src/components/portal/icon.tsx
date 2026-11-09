'use client';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ComponentProps } from 'react';
export function Icon({ icon, size = 18 }: { icon: ComponentProps<typeof HugeiconsIcon>['icon']; size?: number }) {
  return <HugeiconsIcon icon={icon} size={size} strokeWidth={1.5} aria-hidden="true" />;
}
