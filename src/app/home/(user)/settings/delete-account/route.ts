import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authRoute } from "@/server/auth-wrapper";

/**
 * Deletes the caller's own account, permanently.
 *
 * A Route Handler rather than a Server Action because it needs the
 * service-role client: there is no DELETE grant on `public.accounts` (see
 * `999-grants.sql`) and no client-callable path to remove a row from
 * `auth.users` at all — `accounts` only disappears via that table's
 * `on delete cascade`. `authRoute` still authenticates the caller first, so
 * the admin client is only ever pointed at `user.id`, never an
 * attacker-supplied id.
 *
 * POST, not DELETE: this is invoked from a client fetch behind a confirm
 * step in the settings UI, not a REST resource a browser would link to.
 */
export const POST = authRoute(async ({ user, supabase }) => {
  // Sign out first — deleting the user out from under a live session leaves
  // stale cookies the client would otherwise keep sending.
  await supabase.auth.signOut();

  const admin = getSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    console.error("[delete-account] failed to delete user", error);
    return NextResponse.json(
      { success: false, message: "Could not delete your account. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
});
