'use client';

import { useState } from 'react';

import { Eye, EyeOff, Lock } from 'lucide-react';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { cn } from '@/lib/utils';

export function PasswordInput({
  groupClassName,
  disabled,
  ...props
}: React.ComponentProps<'input'> & { groupClassName?: string }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <InputGroup className={cn(groupClassName)}>
      <InputGroupInput
        data-test="password-input"
        type={showPassword ? 'text' : 'password'}
        placeholder={'************'}
        disabled={disabled}
        {...props}
      />

      <InputGroupAddon>
        <Lock aria-hidden="true" />
      </InputGroupAddon>

      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          disabled={disabled}
          aria-label={showPassword ? "Hide password" : "Show password"}
          aria-pressed={showPassword}
          onClick={() => setShowPassword((visible) => !visible)}
        >
          {showPassword ? (
            <EyeOff aria-hidden="true" />
          ) : (
            <Eye aria-hidden="true" />
          )}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
