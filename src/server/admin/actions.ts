"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authAction } from "@/server/auth-wrapper";
import { ForbiddenError } from "@/server/auth-wrapper/errors";

/** Throw if the calling user is not an admin. */
function requireAdmin(role: string | undefined) {
  if (role !== "admin") {
    throw new ForbiddenError("Admin access required.");
  }
}

// ── Create user ───────────────────────────────────────────────────────────────

const CreateUserSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  name: z.string().trim().min(1, "Name is required.").max(80, "Name is too long."),
});

export const createUserAction = authAction(
  async (ctx, input) => {
    requireAdmin(ctx.account.role);

    const admin = getSupabaseAdminClient();

    // Create the auth user. email_confirm:true skips the confirmation email so
    // the admin-provided password works immediately.
    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { name: input.name },
    });

    if (userError) {
      return { ok: false as const, error: userError.message };
    }

    // The handle_new_user() trigger creates the accounts row automatically
    // from user_metadata.name. Patch it here in case the trigger fell back to
    // the email prefix (the trigger runs asynchronously; this call is safe even
    // if the row is not yet present because it only updates existing rows).
    await admin
      .from("accounts")
      .update({ name: input.name, role: "user" })
      .eq("id", userData.user.id);

    revalidateTag("admin-data", "max");
    revalidatePath("/home/admin", "layout");
    return { ok: true as const, id: userData.user.id };
  },
  { schema: CreateUserSchema },
);

// ── Update role ───────────────────────────────────────────────────────────────

const UpdateRoleSchema = z.object({
  targetId: z.uuid("Invalid user ID."),
  role: z.enum(["admin", "user"]),
});

export const updateRoleAction = authAction(
  async (ctx, input) => {
    requireAdmin(ctx.account.role);

    // Safety guard: admins cannot change their own role.
    if (input.targetId === ctx.user.id) {
      return { ok: false as const, error: "You cannot change your own role." };
    }

    const admin = getSupabaseAdminClient();

    // 1. Update the accounts table (the UI reads from here).
    const { error: dbError } = await admin
      .from("accounts")
      .update({ role: input.role })
      .eq("id", input.targetId);

    if (dbError) {
      return { ok: false as const, error: dbError.message };
    }

    // 2. Sync to app_metadata so the JWT carries the new role after the user's
    //    next token refresh.
    const { error: authError } = await admin.auth.admin.updateUserById(input.targetId, {
      app_metadata: { role: input.role },
    });

    if (authError) {
      return { ok: false as const, error: authError.message };
    }

    revalidateTag("admin-data", "max");
    revalidatePath("/home/admin", "layout");
    return { ok: true as const };
  },
  { schema: UpdateRoleSchema },
);
