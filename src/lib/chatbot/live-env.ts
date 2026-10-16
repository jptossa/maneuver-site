import { revalidatePath } from "next/cache";
import * as data from "@/lib/data";
import type { ToolEnv } from "./tools";

/** The real environment: the signed-in user's Supabase data, with cached pages refreshed after writes. */
export const liveEnv: ToolEnv = {
  store: data,
  onWrite() {
    revalidatePath("/activity");
    revalidatePath("/charts");
  },
};
