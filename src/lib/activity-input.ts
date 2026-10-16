import { format, isValid, parseISO } from "date-fns";
import {
  ACTIVITY_TYPES,
  type ActivityInput,
  type ActivityStatus,
  type ActivityType,
} from "./types";
import { displayToKm, KM_PER_MILE, type DistanceUnit } from "./units";

export const FIELDS = [
  "date",
  "type",
  "durationMin",
  "distance",
  "notes",
] as const;
export type Field = (typeof FIELDS)[number];

/** Raw (string) form values, as typed by the user. */
export type RawInput = Partial<Record<Field, string>>;
export type FieldErrors = Partial<Record<Field, string>>;

/** State returned by the create/update server actions to `useActionState`. */
export type ActivityFormState = {
  errors: FieldErrors;
  values: RawInput;
  /** Form-level error (e.g. the activity was deleted in another tab). */
  message?: string;
} | null;

export type ParseResult =
  | { ok: true; value: ActivityInput }
  | { ok: false; errors: FieldErrors };

const MAX_DURATION_MIN = 1440; // one day
const MAX_DISTANCE_KM = 99999.99; // numeric(7,2)
const MAX_NOTES = 500;

export function formDataToRaw(formData: FormData): RawInput {
  const raw: RawInput = {};
  for (const f of FIELDS) {
    const v = formData.get(f);
    if (typeof v === "string") raw[f] = v;
  }
  return raw;
}

/**
 * Validates user-supplied activity fields. `status` comes from the caller, not
 * the form: completed dates may not be after `today`, planned dates may not be before it.
 * `unit` is the unit `raw.distance` was typed in; the result's `distanceKm` is always km.
 */
export function parseActivityInput(
  raw: RawInput,
  today: Date,
  status: ActivityStatus,
  unit: DistanceUnit,
): ParseResult {
  const errors: FieldErrors = {};

  const date = (raw.date ?? "").trim();
  const todayIso = format(today, "yyyy-MM-dd");
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date) ? parseISO(date) : null;
  if (!parsed || !isValid(parsed) || format(parsed, "yyyy-MM-dd") !== date) {
    errors.date = "Enter a valid date.";
  } else if (status === "completed" && date > todayIso) {
    errors.date = "Date can't be in the future.";
  } else if (status === "planned" && date < todayIso) {
    errors.date = "Planned date can't be in the past.";
  }

  const type = (raw.type ?? "").trim();
  if (!(ACTIVITY_TYPES as readonly string[]).includes(type)) {
    errors.type = "Choose an activity type.";
  }

  const durationStr = (raw.durationMin ?? "").trim();
  const durationMin = /^\d+$/.test(durationStr) ? Number(durationStr) : NaN;
  if (!(durationMin >= 1 && durationMin <= MAX_DURATION_MIN)) {
    errors.durationMin = `Enter whole minutes between 1 and ${MAX_DURATION_MIN}.`;
  }

  // The user types distance in `unit`; it's stored in km.
  const distanceStr = (raw.distance ?? "").trim();
  let distanceKm: number | null = null;
  if (distanceStr !== "") {
    const n = Number(distanceStr);
    const km = displayToKm(n, unit);
    if (!Number.isFinite(n) || n < 0 || km > MAX_DISTANCE_KM) {
      const max = Math.floor(
        unit === "mi" ? MAX_DISTANCE_KM / KM_PER_MILE : MAX_DISTANCE_KM,
      );
      errors.distance = `Enter a distance between 0 and ${max.toLocaleString("en-US")} ${unit}, or leave it blank.`;
    } else {
      distanceKm = km;
    }
  }

  const notes = (raw.notes ?? "").trim();
  if (notes.length > MAX_NOTES) {
    errors.notes = `Notes can be at most ${MAX_NOTES} characters.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      date,
      type: type as ActivityType,
      status,
      durationMin,
      distanceKm,
      notes: notes === "" ? null : notes,
    },
  };
}
