/**
 * Wire format of a successful POST /api/chat: newline-delimited JSON, one event
 * per line. Failures before streaming starts (bad input, no key, rate limit)
 * are ordinary JSON responses with an error status instead: `{ error: string }`.
 */
export type ChatEvent =
  | { type: "text"; delta: string }
  | { type: "done"; wrote: boolean }
  | { type: "error"; message: string };
