import { GUIDELINES_SOURCE, type GuidelineProgress } from "@/lib/guidelines";

/** Progress over the last 7 days (not the viewed period) against the CDC adult weekly targets. */
export default function WeeklyGuidelines({ progress }: { progress: GuidelineProgress }) {
  const { moderateEquivalentMinutes, muscleStrengtheningDays, target } = progress;
  return (
    <section aria-label="Weekly activity guidelines">
      <h2>Last 7 days vs. weekly guidelines</h2>
      <p>
        <label>
          Aerobic: {moderateEquivalentMinutes} of {target.moderateEquivalentMinutes} moderate-equivalent minutes{" "}
          <progress value={moderateEquivalentMinutes} max={target.moderateEquivalentMinutes} />
        </label>
      </p>
      <p>
        <label>
          Muscle-strengthening: {muscleStrengtheningDays} of {target.muscleStrengtheningDays} days{" "}
          <progress value={muscleStrengtheningDays} max={target.muscleStrengtheningDays} />
        </label>
      </p>
      <p>
        <small>
          Moderate minutes count once and vigorous minutes twice. Strength, calisthenics and
          climbing count toward muscle-strengthening days. Targets:{" "}
          <a href={GUIDELINES_SOURCE.url}>{GUIDELINES_SOURCE.name}</a>.
        </small>
      </p>
    </section>
  );
}
