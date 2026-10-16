import { setWeight } from "@/app/auth/actions";
import {
  MAX_WEIGHT_KG,
  MIN_WEIGHT_KG,
  kgToDisplay,
  weightInputValue,
  weightUnit,
  type UnitSystem,
} from "@/lib/units";

/** Body weight for calorie estimates, in the account's unit. Server component: plain form post to `setWeight`. */
export default function WeightForm({
  weightKg,
  units,
}: {
  weightKg: number | null;
  units: UnitSystem;
}) {
  const unit = weightUnit(units);
  return (
    <form action={setWeight} aria-label="Body weight">
      <small>Weight ({unit}):</small>{" "}
      <input
        type="number"
        name="weight"
        step="0.1"
        min={kgToDisplay(MIN_WEIGHT_KG, units)}
        max={kgToDisplay(MAX_WEIGHT_KG, units)}
        defaultValue={weightInputValue(weightKg, units)}
        placeholder="for calories"
        aria-label={`Body weight in ${unit}, used to estimate calories`}
        // Re-key on the stored value so the field refreshes after a save or unit change.
        key={`${weightKg ?? "none"}-${unit}`}
      />{" "}
      <button type="submit">Save</button>
    </form>
  );
}
