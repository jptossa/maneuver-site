"use server";

import { format } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  formDataToRaw,
  parseActivityInput,
  type ActivityFormState,
} from "@/lib/activity-input";
import {
  ActivityNotFoundError,
  completeActivity,
  createActivity,
  deleteActivity,
  updateActivity,
} from "@/lib/data";
import { buildHref } from "@/lib/href";
import { getMockActivities } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";
import type { ActivityStatus } from "@/lib/types";

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

async function create(
  status: ActivityStatus,
  formPath: string,
  formData: FormData,
): Promise<ActivityFormState> {
  const raw = formDataToRaw(formData);
  const result = parseActivityInput(raw, new Date(), status);
  if (!result.ok) return { errors: result.errors, values: raw };

  await requireUser(formPath);
  await createActivity(result.value);

  revalidateActivity();
  redirect(dayHref(result.value.date));
}

export async function createActivityAction(
  _prev: ActivityFormState,
  formData: FormData,
): Promise<ActivityFormState> {
  return create("completed", "/activity/new", formData);
}

export async function createPlannedActivityAction(
  _prev: ActivityFormState,
  formData: FormData,
): Promise<ActivityFormState> {
  return create("planned", "/activity/plan", formData);
}

/** `status` is bound by the edit page and decides which date rule applies. */
export async function updateActivityAction(
  id: string,
  status: ActivityStatus,
  _prev: ActivityFormState,
  formData: FormData,
): Promise<ActivityFormState> {
  const raw = formDataToRaw(formData);
  const result = parseActivityInput(raw, new Date(), status);
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

/** Marks a planned workout as done, then shows the day it ended up on. */
export async function completeActivityAction(id: string, formData: FormData) {
  await requireUser("/activity");
  let date: string | null = null;
  try {
    date = await completeActivity(id, format(new Date(), "yyyy-MM-dd"));
  } catch (e) {
    // Already completed, deleted, or not theirs: nothing left to do.
    if (!(e instanceof ActivityNotFoundError)) throw e;
  }

  revalidateActivity();
  redirect(date ? dayHref(date) : returnHref(formData));
}

function returnHref(formData: FormData) {
  const date = formData.get("date");
  return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? dayHref(date)
    : "/activity";
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
  redirect(returnHref(formData));
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
    status: "completed",
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
