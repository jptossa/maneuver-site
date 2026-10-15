/** Model used by the assistant. Override with CHATBOT_MODEL to try another one. */
export const CHATBOT_MODEL = process.env.CHATBOT_MODEL ?? "claude-haiku-5-5";

/** The (fictional) human the assistant hands off to when it is out of its depth. */
export const REPRESENTATIVE = {
  name: "Sifu Sensei",
  title: "Maneuver Customer Care Representative",
  base: "Three Mile Island, Pennsylvania",
  phone: "(717) 555-0142",
} as const;

export const LIMITS = {
  /** Longest single user message accepted, in characters. */
  messageChars: 1000,
  /** Most recent messages sent to the model. */
  historyMessages: 20,
  /** Output cap per model call. */
  maxTokens: 1024,
  /** Model calls per chat request (each tool round trip costs one). */
  maxToolRounds: 6,
  /** Activity rows returned to the model by one history lookup. */
  historyRows: 100,
  /** Requests allowed per window, per caller. */
  requestsPerWindow: { anonymous: 15, signedIn: 40 },
  windowMs: 10 * 60 * 1000,
} as const;
