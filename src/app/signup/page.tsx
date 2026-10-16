import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { signup } from "@/app/auth/actions";
import { safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign up · Maneuver" };

async function SignupForm({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const error = typeof sp.error === "string" ? sp.error : null;

  if (sp["check-email"]) {
    return (
      <p>
        Almost there — check your email for a confirmation link, then{" "}
        <Link href="/login">log in</Link>. (Look in spam if it&apos;s shy.)
      </p>
    );
  }

  return (
    <>
      {error && <p role="alert">{error}</p>}
      <form action={signup}>
        <input type="hidden" name="next" value={next} />
        <p>
          <label>
            Email <input type="email" name="email" required autoComplete="email" />
          </label>
        </p>
        <p>
          <label>
            Password{" "}
            <input
              type="password"
              name="password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>
        </p>
        <button type="submit">Create account</button>
      </form>
      <p>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </>
  );
}

export default function SignupPage(props: PageProps<"/signup">) {
  return (
    <>
      <h1>Sign up</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <SignupForm {...props} />
      </Suspense>
    </>
  );
}
