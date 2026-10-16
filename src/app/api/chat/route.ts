import Anthropic from "@anthropic-ai/sdk";
import { runAgent, type ChatTurn } from "@/lib/chatbot/agent";
import { LIMITS } from "@/lib/chatbot/config";
import { claimSonnetUse, liveEnv } from "@/lib/chatbot/live-env";
import { DEFAULT_UNITS, parseUnits, type UnitSystem } from "@/lib/units";
import type { ChatEvent } from "@/lib/chatbot/protocol";
import { allowRequest } from "@/lib/chatbot/rate-limit";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/** Errors that happen before streaming starts. Success is an NDJSON stream (see protocol.ts). */
function json(body: { error: string }, status: number) {
  return Response.json(body, { status });
}

/** Validates the client-supplied history: text-only turns, starting and ending with the user. */
function parseHistory(body: unknown): ChatTurn[] | string {
  const raw =
    typeof body === "object" && body !== null
      ? (body as { messages?: unknown }).messages
      : null;
  if (!Array.isArray(raw) || raw.length === 0) return "Send at least one message.";

  const turns: ChatTurn[] = [];
  for (const m of raw.slice(-LIMITS.historyMessages)) {
    const role = (m as { role?: unknown })?.role;
    const content = (m as { content?: unknown })?.content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
      return "Messages must be text from the user or assistant.";
    }
    if (content.length > LIMITS.messageChars * 4) return "That message is too long.";
    turns.push({ role, content });
  }

  // The API needs the conversation to start with, and end on, a user turn.
  while (turns.length > 0 && turns[0].role !== "user") turns.shift();
  const last = turns[turns.length - 1];
  if (!last || last.role !== "user" || last.content.trim() === "") {
    return "Send a message to get started.";
  }
  if (last.content.length > LIMITS.messageChars) {
    return `Please keep messages under ${LIMITS.messageChars} characters.`;
  }
  return turns;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const history = parseHistory(body);
  if (typeof history === "string") return json({ error: history }, 400);

  if (!process.env.ANTHROPIC_API_KEY) {
    return json({ error: "The assistant isn't set up yet. Please check back soon." }, 503);
  }

  // Signed-in users get history-aware tools. RLS (not this check) protects their data.
  let userId: string | null = null;
  let units: UnitSystem = DEFAULT_UNITS;
  if (getSupabaseEnv()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    userId = typeof data?.claims.sub === "string" ? data.claims.sub : null;
    units = parseUnits(data?.claims.user_metadata?.units);
  }
  const signedIn = userId !== null;

  // x-forwarded-for is only trustworthy behind a proxy that sets it; fine for a best-effort limit.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const allowed = allowRequest(
    signedIn ? `user:${userId}` : `ip:${ip}`,
    signedIn ? LIMITS.requestsPerWindow.signedIn : LIMITS.requestsPerWindow.anonymous,
  );
  if (!allowed) {
    return json(
      { error: "That's a lot of chatting. Take a stretch and try again in a few minutes." },
      429,
    );
  }

  // From here on the status is 200 and anything that goes wrong is sent as an "error" event.
  const encoder = new TextEncoder();
  let clientGone = false;
  const events = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatEvent) => {
        if (clientGone) return;
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        const { wrote } = await runAgent({
          history,
          signedIn,
          env: liveEnv,
          units,
          claimSonnet: claimSonnetUse,
          signal: request.signal,
          onText: (delta) => send({ type: "text", delta }),
        });
        send({ type: "done", wrote });
      } catch (e) {
        if (!clientGone) send({ type: "error", message: friendlyError(e) });
      } finally {
        if (!clientGone) controller.close();
      }
    },
    cancel() {
      // The browser disconnected; request.signal aborts the model call too.
      clientGone = true;
    },
  });

  return new Response(events, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

function friendlyError(e: unknown): string {
  if (e instanceof Anthropic.RateLimitError) {
    return "The assistant is busy right now. Try again shortly.";
  }
  if (e instanceof Anthropic.AuthenticationError) {
    console.error("chat: Anthropic rejected the API key");
    return "The assistant isn't set up correctly yet.";
  }
  console.error("chat: request failed", e);
  return "Something went wrong. Please try again.";
}
