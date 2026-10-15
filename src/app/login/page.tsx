import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { login } from "@/app/auth/actions";
import { safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Log in · Maneuver" };

async function LoginForm({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const error = typeof sp.error === "string" ? sp.error : null;

  return (
    <>
      {error && <p role="alert">{error}</p>}
      <form action={login}>
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
              autoComplete="current-password"
            />
          </label>
        </p>
        <button type="submit">Log in</button>
      </form>
      <p>
        No account? <Link href="/signup">Sign up</Link>
      </p>
    </>
  );
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <>
      <h1>Log in</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <LoginForm {...props} />
      </Suspense>
    </>
  );
}
