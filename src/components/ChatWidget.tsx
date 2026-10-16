"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatEvent } from "@/lib/chatbot/protocol";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const MAX_CHARS = 1000; // keep in sync with LIMITS.messageChars in src/lib/chatbot/config.ts

export default function ChatWidget({ signedIn }: { signedIn: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, pending]);

  // Stop an in-flight reply if the user leaves the page.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || pending) return;

    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setError(null);
    setPending(true);

    const controller = new AbortController();
    abortRef.current = controller;

    // Appends streamed text to the assistant message, creating it on the first chunk.
    let started = false;
    const append = (delta: string) => {
      const isFirst = !started;
      started = true;
      setMessages((prev) =>
        isFirst
          ? [...prev, { role: "assistant", content: delta }]
          : prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: m.content + delta } : m,
            ),
      );
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        // Rejected before streaming began: a plain JSON { error }.
        const data: { error?: string } = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event: ChatEvent = JSON.parse(line);
          if (event.type === "text") append(event.delta);
          else if (event.type === "error") setError(event.message);
        }
      }
      if (!started) setError("The assistant didn't reply. Please try again.");
    } catch {
      if (!controller.signal.aborted) {
        setError(
          started
            ? "The connection dropped mid-reply. Please try again."
            : "Couldn't reach the assistant. Check your connection and try again.",
        );
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-label="Activity assistant">
      <p>
        {signedIn
          ? "Ask for ideas, get recommendations based on your history, or tell me what you did (or want to do) and I'll log or plan it."
          : "Ask for activity ideas. Log in and I can tailor suggestions to your history and help you log or plan activities."}
      </p>

      <div role="log" aria-live="polite" aria-busy={pending}>
        {messages.length === 0 && (
          <p>
            <em>
              Try: &ldquo;I have 30 minutes and a mild case of laziness.&rdquo;
            </em>
          </p>
        )}
        {messages.map((m, i) => (
          <p
            key={i}
            className={`message ${m.role}`}
            style={{ whiteSpace: "pre-wrap" }}
          >
            <strong>{m.role === "user" ? "You" : "Maneuver"}:</strong>{" "}
            {m.content}
          </p>
        ))}
        {pending && messages[messages.length - 1]?.role === "user" && (
          <p>
            <em>Thinking…</em>
          </p>
        )}
        <div ref={endRef} />
      </div>

      {error && <p role="alert">{error}</p>}

      <form onSubmit={send}>
        <label htmlFor="chat-input">Your message</label>
        <br />
        <textarea
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          maxLength={MAX_CHARS}
          rows={3}
          style={{ width: "100%" }}
        />
        <br />
        <button type="submit" disabled={pending || input.trim() === ""}>
          Send
        </button>
      </form>
    </section>
  );
}
