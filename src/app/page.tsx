import Image from "next/image";
import Link from "next/link";
import heroPhoto from "@/assets/hero.jpg";

const benefits = [
  {
    title: "Every kind of movement counts",
    body: "Workouts, bike commutes, weekend hikes, walks to the shop — Maneuver captures all of it, not just gym sessions. Yes, even the sprint for the bus.",
  },
  {
    title: "See the bigger picture",
    body: "Look at your activity by day, week, month or year to spot patterns and trends instead of guessing. Your memory of \"I basically train every day\" is about to meet the data.",
  },
  {
    title: "Stay motivated",
    body: "Clear totals and charts make progress visible, so it is easier to keep a habit going. Discipline is easier when someone is keeping score, and that someone is a bar chart.",
  },
  {
    title: "One place for everything",
    body: "Stop juggling apps and notebooks. Keep your whole movement history together, with no \"how was your workout?\" survey at the end.",
  },
];

const services = [
  {
    title: "Activity tracking",
    body: "Log activities and review them across daily, weekly, monthly and yearly views. Plan the workout, then do the workout. We can only help with the first part.",
    href: "/activity",
  },
  {
    title: "Charts & insights",
    body: "Graph your time, distance and sessions, and see how your activity types stack up. The numbers are honest; we just make them look good.",
    href: "/charts",
  },
  {
    title: "Activity assistant",
    body: "Chat with an assistant that suggests activities you might enjoy. With an account it can also learn from your history and help you log or plan what you do. It will not judge your rest days. Much.",
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
            anyone can build a more active life — one maneuver at a time. Train
            seriously. Take yourself a little less seriously.
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
