"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  formDataToRaw,
  parseActivityInput,
  type ActivityFormState,
} from "@/lib/activity-input";
import {
  ActivityNotFoundError,
  createActivity,
  deleteActivity,
  updateActivity,
} from "@/lib/data";
import { buildHref } from "@/lib/href";
import { getMockActivities } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";

const BATCH_SIZE = 500;

/** Redirects to login unless signed in. RLS is still the real authorization. */
async function requireUser(next: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect(`/login?next=${encodeURIComponent(next)}`);
  return supabase;
}

function revalidateActivity() {
  revalidatePath("/activity");
  revalidatePath("/charts");
}

function dayHref(date: string) {
  return buildHref("/activity", { scale: "day", date });
}

export async function createActivityAction(
  _prev: ActivityFormState,
  formData: FormData,
): Promise<ActivityFormState> {
  const raw = formDataToRaw(formData);
  const result = parseActivityInput(raw, new Date());
  if (!result.ok) return { errors: result.errors, values: raw };

  await requireUser("/activity/new");
  await createActivity(result.value);

  revalidateActivity();
  redirect(dayHref(result.value.date));
}

export async function updateActivityAction(
  id: string,
  _prev: ActivityFormState,
  formData: FormData,
): Promise<ActivityFormState> {
  const raw = formDataToRaw(formData);
  const result = parseActivityInput(raw, new Date());
  if (!result.ok) return { errors: result.errors, values: raw };

  await requireUser(`/activity/${id}/edit`);
  try {
    await updateActivity(id, result.value);
  } catch (e) {
    if (e instanceof ActivityNotFoundError) {
      return {
        errors: {},
        values: raw,
        message: "This activity no longer exists.",
      };
    }
    throw e;
  }

  revalidateActivity();
  redirect(dayHref(result.value.date));
}

/** `date` (hidden form field) is only used to return to the right day view. */
export async function deleteActivityAction(id: string, formData: FormData) {
  await requireUser("/activity");
  try {
    await deleteActivity(id);
  } catch (e) {
    // Already gone (or not theirs): nothing left to delete.
    if (!(e instanceof ActivityNotFoundError)) throw e;
  }

  revalidateActivity();
  const date = formData.get("date");
  redirect(
    typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? dayHref(date)
      : "/activity",
  );
}

/**
 * Inserts ~a year of generated sample activities for the signed-in user.
 * Runs with the user's own RLS-scoped client, so it can only write their rows
 * (user_id defaults to auth.uid() in the database).
 */
export async function loadSampleData() {
  const supabase = await requireUser("/activity");

  const rows = getMockActivities().map((a) => ({
    date: a.date,
    type: a.type,
    duration_min: a.durationMin,
    distance_km: a.distanceKm,
  }));

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const { error } = await supabase
      .from("activities")
      .insert(rows.slice(i, i + BATCH_SIZE));
    if (error) throw new Error(`Failed to load sample data: ${error.message}`);
  }

  revalidateActivity();
}
