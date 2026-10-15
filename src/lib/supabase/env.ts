export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  try {
    // Supabase clients append their own paths (/auth/v1, /rest/v1), so a pasted
    // URL with a path or trailing slash causes "Invalid path specified in request URL".
    return { url: new URL(url.trim()).origin, key: key.trim() };
  } catch {
    return null;
  }
}

export function requireSupabaseEnv() {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill them in.",
    );
  }
  return env;
}
