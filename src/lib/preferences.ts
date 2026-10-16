import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { parseUnits, parseWeightKg, type UnitSystem } from "@/lib/units";

/**
 * The signed-in user's unit system, stored in Supabase `user_metadata.units`.
 * Logged-out visitors (and anyone who hasn't chosen) get the default. Users can
 * edit their own metadata, so the value goes through `parseUnits`' allow-list.
 * Must run inside a `<Suspense>` boundary (reads cookies).
 */
export const getUnits = cache(async (): Promise<UnitSystem> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return parseUnits(data?.claims.user_metadata?.units);
});

/**
 * The signed-in user's body weight in kg (`user_metadata.weightKg`), or null when
 * unset or implausible. Used only for calorie estimates. Same constraints as getUnits.
 */
export const getWeightKg = cache(async (): Promise<number | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return parseWeightKg(data?.claims.user_metadata?.weightKg);
});
