import Image from "next/image";
import Link from "next/link";
import heroPhoto from "@/assets/hero.jpg";

const benefits = [
  {
    title: "Every kind of movement counts",
    body: "Workouts, bike commutes, weekend hikes, walks to the shop — Maneuver captures all of it, not just gym sessions.",
  },
  {
    title: "See the bigger picture",
    body: "Look at your activity by day, week, month or year to spot patterns and trends instead of guessing.",
  },
  {
    title: "Stay motivated",
    body: "Clear totals and charts make progress visible, so it is easier to keep a habit going.",
  },
  {
    title: "One place for everything",
    body: "Stop juggling apps and notebooks. Keep your whole movement history together.",
  },
];

const services = [
  {
    title: "Activity tracking",
    body: "Log activities and review them across daily, weekly, monthly and yearly views.",
    href: "/activity",
  },
  {
    title: "Charts & insights",
    body: "Graph your time, distance and sessions, and see how your activity types stack up.",
    href: "/charts",
  },
  {
    title: "Activity assistant",
    body: "Chat with an assistant that suggests activities you might enjoy. With an account it can also learn from your history and help you log or plan what you do.",
    href: "/assistant",
  },
];

export default function Home() {
  return (
    <>
      {/* Decorative full-width backdrop behind the header and hero; the scrim in globals.css keeps the text readable in both themes. */}
      <div className="hero-backdrop" aria-hidden="true">
        {/* The frame starts below the sticky header so the fighters' heads aren't hidden or cropped. */}
        <div className="hero-photo-frame">
          <Image
            src={heroPhoto}
            alt=""
            fill
            sizes="100vw"
            loading="eager"
            fetchPriority="high"
            className="hero-photo"
          />
        </div>
      </div>
      <section className="hero">
        <div className="hero-content">
          <h1>Move more. Notice more.</h1>
          <p>
            Our mission is to make everyday movement visible and rewarding, so
            anyone can build a more active life — one maneuver at a time.
          </p>
          <p className="cta">
            <Link href="/signup" className="button">
              Sign up free
            </Link>{" "}
            <Link href="/login" className="button secondary">
              Log in
            </Link>{" "}
            <Link href="/activity">View my activity</Link>{" "}
            <Link href="/charts">See the charts</Link>
          </p>
        </div>
      </section>

      <section>
        <h2>Why Maneuver</h2>
        <ul className="cards">
          {benefits.map((b) => (
            <li key={b.title}>
              <h3>{b.title}</h3>
              <p>{b.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>What we offer</h2>
        <ul className="cards">
          {services.map((s) => (
            <li key={s.title}>
              <h3>{s.href ? <Link href={s.href}>{s.title}</Link> : s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
