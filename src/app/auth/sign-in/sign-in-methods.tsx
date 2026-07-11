"use client";

import { useState } from "react";
import { SignInForm } from "./sign-in-form";
import { MagicLinkForm } from "./magic-link-form";

/**
 * Toggles between password and magic-link sign-in. Kept client-side so
 * switching modes doesn't round-trip the server — the two forms differ only in
 * which fields render and which action they call.
 */
export function SignInMethods({ next }: { next?: string }) {
  const [mode, setMode] = useState<"password" | "magic-link">("password");

  return (
    <div className="grid gap-4">
      {mode === "password" ? <SignInForm next={next} /> : <MagicLinkForm next={next} />}

      <button
        type="button"
        className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        onClick={() => setMode(mode === "password" ? "magic-link" : "password")}
      >
        {mode === "password" ? "Sign in with a magic link instead" : "Sign in with a password instead"}
      </button>
    </div>
  );
}
