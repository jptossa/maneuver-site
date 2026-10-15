import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maneuver",
  description:
    "Track every kind of movement — workouts, commutes, hikes — across the day, week, month and year.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <header>
          <SiteNav />
        </header>
        <main>{children}</main>
        <footer>
          <small>© Maneuver</small>
        </footer>
      </body>
    </html>
  );
}
