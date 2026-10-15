import Link from "next/link";
import { connection } from "next/server";
import { signout } from "@/app/auth/actions";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function AuthStatus() {
  // getClaims() reads the clock to check token expiry, so mark this as request-time data.
  await connection();
  let email: string | null = null;
  if (getSupabaseEnv()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    email = typeof data?.claims.email === "string" ? data.claims.email : null;
  }

  if (!email) {
    return (
      <>
        <Link href="/login">Log in</Link> <Link href="/signup">Sign up</Link>
      </>
    );
  }

  return (
    <form action={signout}>
      <small>{email}</small> <button type="submit">Log out</button>
    </form>
  );
}
