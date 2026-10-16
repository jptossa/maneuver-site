import { setUnits } from "@/app/auth/actions";
import { UNIT_SYSTEMS, distanceUnit, type UnitSystem } from "@/lib/units";

const LABELS: Record<UnitSystem, string> = {
  us: "US customary",
  metric: "Metric",
};

/** Switches the account's unit system. Server component: plain form posts to `setUnits`. */
export default function UnitToggle({ units }: { units: UnitSystem }) {
  return (
    <form action={setUnits} aria-label="Units">
      <small>Units:</small>{" "}
      {UNIT_SYSTEMS.map((u) => (
        <button
          key={u}
          type="submit"
          name="units"
          value={u}
          aria-pressed={u === units}
          disabled={u === units}
          title={LABELS[u]}
        >
          {u === units ? <strong>{distanceUnit(u)}</strong> : distanceUnit(u)}
        </button>
      ))}
    </form>
  );
}
