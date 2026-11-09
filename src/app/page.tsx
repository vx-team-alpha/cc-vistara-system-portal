import { redirect } from "next/navigation";
import { authPaths } from "@/lib/auth/config";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  redirect(!error && data?.claims ? "/home" : authPaths.signIn);
}
