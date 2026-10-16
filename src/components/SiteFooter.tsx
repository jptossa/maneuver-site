export default function SiteFooter() {
  return (
    <footer>
      <section className="disclaimer" aria-labelledby="disclaimer-title">
        <h2 id="disclaimer-title">Disclaimer</h2>
        <p>
          Maneuver is a tracking and planning tool, not medical advice. Calorie
          figures are estimates, and the weekly guidelines are public CDC
          targets; neither is a diagnosis or a prescription. Talk to a doctor
          before starting or changing an exercise program, and listen to your
          body. If something hurts, stop. Nobody has ever been awarded a
          trophy for ignoring pain.
        </p>
        <p>
          The activity assistant is an AI and can be wrong, so double-check
          anything that matters. Weather comes from the National Weather
          Service. Trail data is volunteer-mapped, so routes can be missing,
          closed or out of date; check conditions and use your judgment before
          heading out. Trail data © OpenStreetMap contributors.
        </p>
        <p>
          Maneuver is an independent project. Its look is an homage and it is
          not affiliated with or endorsed by HBO or the series <em>Warrior</em>.
        </p>
      </section>
      <small className="copyright">© Maneuver</small>
    </footer>
  );
}
