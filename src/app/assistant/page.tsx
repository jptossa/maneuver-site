import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import ChatWidget from "@/components/ChatWidget";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Assistant · Maneuver",
};

export default function AssistantPage() {
  return (
    <>
      <h1>Activity assistant</h1>
      {/* Reads the session cookie, so it must stream behind Suspense (Cache Components). */}
      <Suspense fallback={<p>Loading…</p>}>
        <Chat />
      </Suspense>
    </>
  );
}

async function Chat() {
  await connection();
  let signedIn = false;
  if (getSupabaseEnv()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims);
  }
  return <ChatWidget signedIn={signedIn} />;
}
