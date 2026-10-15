import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

const PROTECTED_PREFIXES = ["/activity", "/charts"];

function loginRedirect(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set(
    "next",
    request.nextUrl.pathname + request.nextUrl.search,
  );
  return NextResponse.redirect(url);
}

/**
 * Refreshes the Supabase session cookie on every request and does an
 * optimistic redirect for logged-out visitors. This is NOT authorization:
 * Row Level Security in Postgres is what actually protects the data.
 */
export async function proxy(request: NextRequest) {
  const isProtected = PROTECTED_PREFIXES.some(
    (p) =>
      request.nextUrl.pathname === p ||
      request.nextUrl.pathname.startsWith(`${p}/`),
  );

  const env = getSupabaseEnv();
  if (!env) return isProtected ? loginRedirect(request) : NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  // Verifies the JWT and refreshes the session when it is near expiry.
  const { data } = await supabase.auth.getClaims();

  if (isProtected && !data?.claims) {
    const redirect = loginRedirect(request);
    // Carry over any refreshed cookies / cache headers.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    response.headers.forEach((value, key) => {
      if (key.toLowerCase().startsWith("cache-control")) {
        redirect.headers.set(key, value);
      }
    });
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
