import Link from "next/link";
import { Suspense } from "react";
import AuthStatus from "./AuthStatus";
import ThemeToggle from "./ThemeToggle";

export default function SiteNav() {
  return (
    <nav aria-label="Main">
      <Link href="/" className="wordmark">
        Maneuver
      </Link>
      <div>
        <ul>
          <li>
            <Link href="/activity">Activity</Link>
          </li>
          <li>
            <Link href="/charts">Charts</Link>
          </li>
          <li>
            <Link href="/assistant">Assistant</Link>
          </li>
          <li>
            {/* Reads the session cookie, so it must stream behind Suspense (Cache Components). */}
            <Suspense fallback={null}>
              <AuthStatus />
            </Suspense>
          </li>
          <li>
            <ThemeToggle />
          </li>
        </ul>
      </div>
    </nav>
  );
}
