import type { Metadata, Viewport } from "next";
import { Cinzel, Inter } from "next/font/google";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const heading = Cinzel({ subsets: ["latin"], variable: "--font-heading" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Maneuver",
  description:
    "Track every kind of movement — workouts, commutes, hikes — across the day, week, month and year.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#110d16" },
    { media: "(prefers-color-scheme: light)", color: "#f2e2c4" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the inline script sets data-theme before React hydrates.
    <html
      lang="en"
      className={`${heading.variable} ${body.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <header>
          <SiteNav />
        </header>
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
