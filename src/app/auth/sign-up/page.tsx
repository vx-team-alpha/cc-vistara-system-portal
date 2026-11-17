import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Sign up" };

/** Public self-serve sign-up is disabled; accounts are created by an admin. */
export default function SignUpPage() {
  redirect("/auth/sign-in");
}
