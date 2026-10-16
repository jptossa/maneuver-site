/** Model used by the assistant. Override with CHATBOT_MODEL to try another one. */
export const CHATBOT_MODEL = process.env.CHATBOT_MODEL ?? "claude-haiku-5-5";

/**
 * Stronger model the default model can hand a difficult question to
 * (escalate_difficult_question). Rationed by LIMITS.sonnetPerDay.
 */
export const ESCALATION_MODEL =
  process.env.CHATBOT_ESCALATION_MODEL ?? "claude-sonnet-5-5";

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
  /** Output cap per call once escalated; leaves room for deeper reasoning plus a longer plan. */
  escalatedMaxTokens: 2048,
  /** Escalations to ESCALATION_MODEL per day, site-wide (counted in Supabase, see migration 0005). */
  sonnetPerDay: 10,
  /** Model calls per chat request (each tool round trip costs one). */
  maxToolRounds: 6,
  /** Activity rows returned to the model by one history lookup. */
  historyRows: 100,
  /** Days of forecast the weather tool returns (two 12-hour periods per day). */
  forecastDays: { default: 4, max: 7 },
  /** Trail search radius in km: used when the model passes none, and the most it can ask for. */
  trailRadiusKm: { default: 25, max: 50 },
  /** Requests allowed per window, per caller. */
  requestsPerWindow: { anonymous: 15, signedIn: 40 },
  windowMs: 10 * 60 * 1000,
} as const;
