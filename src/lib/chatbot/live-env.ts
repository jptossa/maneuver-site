import { revalidatePath } from "next/cache";
import * as data from "@/lib/data";
import { fetchForecast } from "@/lib/outdoors/nws";
import { fetchTrails } from "@/lib/outdoors/overpass";
import { createClient } from "@/lib/supabase/server";
import { LIMITS } from "./config";
import type { ToolEnv } from "./tools";

/** The real environment: the signed-in user's Supabase data, with cached pages refreshed after writes. */
export const liveEnv: ToolEnv = {
  store: data,
  outdoors: { getForecast: fetchForecast, searchTrails: fetchTrails },
  onWrite() {
    revalidatePath("/activity");
    revalidatePath("/charts");
  },
};

/**
 * Tries to claim one of today's Sonnet escalations (site-wide, LIMITS.sonnetPerDay).
 * The count lives in Supabase (migration 0005) so it survives restarts and is shared
 * across server instances. Fails closed: any error, including the migration not being
 * applied yet, means "no", and the chatbot just stays on its default model.
 */
export async function claimSonnetUse(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: granted, error } = await supabase.rpc("claim_chatbot_use", {
      p_kind: "sonnet",
      p_limit: LIMITS.sonnetPerDay,
    });
    if (error) {
      console.error(
        "chat: could not claim a Sonnet escalation (is migration 0005 applied?)",
        error.message,
      );
      return false;
    }
    return granted === true;
  } catch (e) {
    console.error("chat: Sonnet escalation check failed", e);
    return false;
  }
}
