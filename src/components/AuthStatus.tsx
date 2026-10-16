import Link from "next/link";
import { connection } from "next/server";
import { signout } from "@/app/auth/actions";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { parseHomeLocation, type HomeLocation } from "@/lib/location";
import { DEFAULT_UNITS, parseUnits, parseWeightKg } from "@/lib/units";
import LocationForm from "./LocationForm";
import UnitToggle from "./UnitToggle";
import WeightForm from "./WeightForm";

export default async function AuthStatus() {
  // getClaims() reads the clock to check token expiry, so mark this as request-time data.
  await connection();
  let email: string | null = null;
  let units = DEFAULT_UNITS;
  let weightKg: number | null = null;
  let location: HomeLocation | null = null;
  if (getSupabaseEnv()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    email = typeof data?.claims.email === "string" ? data.claims.email : null;
    units = parseUnits(data?.claims.user_metadata?.units);
    weightKg = parseWeightKg(data?.claims.user_metadata?.weightKg);
    location = parseHomeLocation(data?.claims.user_metadata?.homeLocation);
  }

  if (!email) {
    return (
      <span className="auth-links">
        <Link href="/login">Log in</Link>
        <Link href="/signup">Sign up</Link>
      </span>
    );
  }

  return (
    <>
      <details className="settings">
        <summary>Settings</summary>
        <div>
          <UnitToggle units={units} />
          <WeightForm weightKg={weightKg} units={units} />
          <LocationForm location={location} />
        </div>
      </details>
      <form action={signout} className="account">
        <small>{email}</small> <button type="submit">Log out</button>
      </form>
    </>
  );
}
