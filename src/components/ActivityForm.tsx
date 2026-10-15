"use client";

import Link from "next/link";
import { useActionState } from "react";
import type {
  ActivityFormState,
  Field,
  RawInput,
} from "@/lib/activity-input";
import { activityLabel, typesByGroup } from "@/lib/activity-catalog";

export default function ActivityForm({
  action,
  initial,
  minDate,
  maxDate,
  cancelHref,
  submitLabel,
}: {
  action: (
    prev: ActivityFormState,
    formData: FormData,
  ) => Promise<ActivityFormState>;
  initial: RawInput;
  /** Earliest selectable date (today, for planned workouts), yyyy-MM-dd */
  minDate?: string;
  /** Latest selectable date (today, for completed activities), yyyy-MM-dd */
  maxDate?: string;
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  // After a failed submit, show what the user typed rather than the initial values.
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};

  const error = (field: Field) =>
    errors[field] ? (
      <span role="alert" id={`${field}-error`}>
        {" "}
        {errors[field]}
      </span>
    ) : null;
  const describedBy = (field: Field) =>
    errors[field] ? `${field}-error` : undefined;

  return (
    <form action={formAction}>
      {state?.message && <p role="alert">{state.message}</p>}
      <p>
        <label>
          Date{" "}
          <input
            type="date"
            name="date"
            required
            min={minDate}
            max={maxDate}
            defaultValue={values.date ?? ""}
            aria-invalid={!!errors.date}
            aria-describedby={describedBy("date")}
          />
        </label>
        {error("date")}
      </p>
      <p>
        <label>
          Type{" "}
          <select
            name="type"
            required
            defaultValue={values.type ?? ""}
            aria-invalid={!!errors.type}
            aria-describedby={describedBy("type")}
          >
            <option value="" disabled>
              Choose…
            </option>
            {typesByGroup().map(({ group, types }) => (
              <optgroup key={group} label={group}>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {activityLabel(t)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        {error("type")}
      </p>
      <p>
        <label>
          Duration (minutes){" "}
          <input
            type="number"
            name="durationMin"
            required
            min={1}
            max={1440}
            step={1}
            inputMode="numeric"
            defaultValue={values.durationMin ?? ""}
            aria-invalid={!!errors.durationMin}
            aria-describedby={describedBy("durationMin")}
          />
        </label>
        {error("durationMin")}
      </p>
      <p>
        <label>
          Distance (km, optional){" "}
          <input
            type="number"
            name="distanceKm"
            min={0}
            step="any"
            inputMode="decimal"
            defaultValue={values.distanceKm ?? ""}
            aria-invalid={!!errors.distanceKm}
            aria-describedby={describedBy("distanceKm")}
          />
        </label>
        {error("distanceKm")}
      </p>
      <p>
        <label>
          Notes (optional){" "}
          <textarea
            name="notes"
            rows={3}
            maxLength={500}
            defaultValue={values.notes ?? ""}
            aria-invalid={!!errors.notes}
            aria-describedby={describedBy("notes")}
          />
        </label>
        {error("notes")}
      </p>
      <button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </button>{" "}
      <Link href={cancelHref}>Cancel</Link>
    </form>
  );
}
