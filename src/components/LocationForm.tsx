"use client";

import { useActionState } from "react";
import { setLocation, type LocationFormState } from "@/app/auth/actions";
import type { HomeLocation } from "@/lib/location";

const INITIAL: LocationFormState = {};

/**
 * Home location for weather and trail suggestions: a US city or ZIP, geocoded on save.
 * Client component only so a failed lookup can show its message.
 */
export default function LocationForm({ location }: { location: HomeLocation | null }) {
  const [state, action, pending] = useActionState(setLocation, INITIAL);
  return (
    <form action={action} aria-label="Home location">
      <small>Location:</small>{" "}
      <input
        type="text"
        name="place"
        maxLength={100}
        defaultValue={location?.label ?? ""}
        placeholder="US city or ZIP"
        aria-label="Home city or ZIP code, used for weather and trail suggestions"
        // Re-key on the stored value so the field refreshes after a save or clear.
        key={location?.label ?? "none"}
      />{" "}
      <button type="submit" disabled={pending}>
        Save
      </button>
      {location && (
        <>
          {" "}
          <button type="submit" name="intent" value="clear" disabled={pending}>
            Clear
          </button>
        </>
      )}{" "}
      <small>
        {state.error ?? "Used for weather and trail ideas; sent to NWS and OpenStreetMap as rounded coordinates."}
      </small>
    </form>
  );
}
