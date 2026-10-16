import Link from "next/link";
import { connection } from "next/server";
import { signout } from "@/app/auth/actions";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_UNITS, parseUnits } from "@/lib/units";
import UnitToggle from "./UnitToggle";

export default async function AuthStatus() {
  // getClaims() reads the clock to check token expiry, so mark this as request-time data.
  await connection();
  let email: string | null = null;
  let units = DEFAULT_UNITS;
  if (getSupabaseEnv()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    email = typeof data?.claims.email === "string" ? data.claims.email : null;
    units = parseUnits(data?.claims.user_metadata?.units);
  }

  if (!email) {
    return (
      <>
        <Link href="/login">Log in</Link> <Link href="/signup">Sign up</Link>
      </>
    );
  }

  return (
    <>
      <UnitToggle units={units} />
      <form action={signout}>
        <small>{email}</small> <button type="submit">Log out</button>
      </form>
    </>
  );
}
