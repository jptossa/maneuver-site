import Anthropic from "@anthropic-ai/sdk";
import {
  CHATBOT_MODEL,
  ESCALATION_MODEL,
  LIMITS,
  REPRESENTATIVE,
} from "./config";
import { ESCALATE_TOOL, ESCALATE_TOOL_NAME } from "./escalation";
import type { HomeLocation } from "@/lib/location";
import type { UnitSystem } from "@/lib/units";
import { buildSystemPrompt } from "./prompt";
import { SIGNED_IN_TOOLS, loadHistorySnapshot, runTool, type ToolEnv } from "./tools";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AgentReply {
  reply: string;
  /** True if the assistant logged or planned something this turn. */
  wrote: boolean;
  /** True if the stronger model answered this turn. */
  escalated: boolean;
}

const FALLBACK_REPLY = `I'm going to hand this one to a human. ${REPRESENTATIVE.name} (${REPRESENTATIVE.title}, ${REPRESENTATIVE.base}) can be reached at ${REPRESENTATIVE.phone}.`;

const ESCALATION_DENIED =
  "Not available right now. Answer the person yourself as well as you can, without mentioning this tool.";

/**
 * Runs one assistant turn: sends the conversation to Claude and, for signed-in
 * users, keeps executing the tools it asks for until it produces a final answer.
 * Text is passed to `onText` as it is generated; the full reply is also returned.
 * Only plain text turns are stored by the client, so tool calls and thinking
 * blocks live and die inside this function.
 *
 * The default model may call escalate_difficult_question. If `claimSonnet` grants
 * a slot, the whole turn is re-run from the original messages on ESCALATION_MODEL
 * (a fresh start, so no thinking blocks cross between models); otherwise the
 * default model is told to answer for itself.
 */
export async function runAgent(opts: {
  history: ChatTurn[];
  signedIn: boolean;
  /** Where signed-in tools read and write. The app passes liveEnv; evals pass an in-memory one. */
  env: ToolEnv;
  /** The user's unit system: tool results and replies use it for distances. */
  units: UnitSystem;
  /** Body weight in kg for calorie estimates; null when the user hasn't set it. */
  weightKg: number | null;
  /** Home location for weather and trail lookups; null when the user hasn't saved one. */
  location: HomeLocation | null;
  /** Claims one of the day's escalations; resolves false when none are left. */
  claimSonnet: () => Promise<boolean>;
  today?: Date;
  onText?: (delta: string) => void;
  /** Aborts the model call, e.g. when the browser disconnects. */
  signal?: AbortSignal;
}): Promise<AgentReply> {
  const today = opts.today ?? new Date();
  const client = new Anthropic();
  const snapshot = opts.signedIn
    ? await loadHistorySnapshot(today, opts.env, opts.units, opts.weightKg)
    : undefined;
  const baseMessages = (): Anthropic.MessageParam[] =>
    opts.history.map((m) => ({ role: m.role, content: m.content }));

  const dataTools = opts.signedIn ? SIGNED_IN_TOOLS : [];
  let model: string = CHATBOT_MODEL;
  let system = buildSystemPrompt({
    signedIn: opts.signedIn,
    today,
    snapshot,
    canEscalate: true,
    units: opts.units,
    locationLabel: opts.location?.label ?? null,
  });
  let tools: Anthropic.Tool[] | undefined = [...dataTools, ESCALATE_TOOL];
  let messages = baseMessages();

  let escalated = false;
  let escalationTried = false;
  let reply = "";
  let wrote = false;

  /** Appends to the reply, keeping text from separate model calls in separate paragraphs. */
  let paragraphBreakPending = false;
  const emit = (text: string) => {
    if (!text) return;
    if (paragraphBreakPending && reply) {
      reply += "\n\n";
      opts.onText?.("\n\n");
    }
    paragraphBreakPending = false;
    reply += text;
    opts.onText?.(text);
  };
  const finish = (): AgentReply => {
    if (!reply.trim()) emit(FALLBACK_REPLY);
    return { reply: reply.trim(), wrote, escalated };
  };

  for (let round = 0; round < LIMITS.maxToolRounds; round++) {
    // Tool inputs here are tiny, so they stay buffered (no eager_input_streaming)
    // and arrive complete and validated by the API.
    const stream = client.messages.stream(
      {
        model,
        max_tokens: escalated ? LIMITS.escalatedMaxTokens : LIMITS.maxTokens,
        system,
        tools,
        messages,
        // Short conversational replies don't need deep reasoning; the escalated
        // model is there for the hard ones, so it gets more.
        output_config: { effort: escalated ? "medium" : "low" },
      },
      { signal: opts.signal },
    );
    stream.on("text", emit);
    const response = await stream.finalMessage();

    if (response.stop_reason === "refusal") {
      paragraphBreakPending = true;
      emit(FALLBACK_REPLY);
      return finish();
    }

    const toolCalls = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (response.stop_reason !== "tool_use" || toolCalls.length === 0) {
      return finish();
    }

    // Escalation: only on its own, only before anything was written (a restart
    // would otherwise lose or repeat a write), and only once per turn.
    const escalateCall = toolCalls.find((c) => c.name === ESCALATE_TOOL_NAME);
    let escalationGranted = false;
    if (escalateCall && !escalated && !escalationTried && !wrote && toolCalls.length === 1) {
      escalationTried = true;
      escalationGranted = await opts.claimSonnet();
    }
    if (escalationGranted && escalateCall) {
      const reason = (escalateCall.input as { reason?: unknown }).reason;
      console.info(
        `chat: escalating to ${ESCALATION_MODEL}: ${typeof reason === "string" ? reason : "(no reason)"}`,
      );
      escalated = true;
      model = ESCALATION_MODEL;
      system = buildSystemPrompt({
        signedIn: opts.signedIn,
        today,
        snapshot,
        canEscalate: false,
        units: opts.units,
        locationLabel: opts.location?.label ?? null,
      });
      tools = dataTools.length > 0 ? dataTools : undefined;
      messages = baseMessages();
      // Text the default model already streamed before escalating stays; this continues it.
      paragraphBreakPending = reply.length > 0;
      continue;
    }

    // Echo the whole assistant turn (including thinking blocks), then answer every tool call at once.
    messages.push({ role: "assistant", content: response.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const call of toolCalls) {
      if (call.name === ESCALATE_TOOL_NAME) {
        results.push({
          type: "tool_result",
          tool_use_id: call.id,
          content: ESCALATION_DENIED,
          is_error: true,
        });
        continue;
      }
      const outcome = await runTool(call.name, call.input, {
        today,
        env: opts.env,
        units: opts.units,
        weightKg: opts.weightKg,
        location: opts.location,
        signal: opts.signal,
      });
      wrote ||= outcome.wrote === true;
      results.push({
        type: "tool_result",
        tool_use_id: call.id,
        content: outcome.content,
        is_error: outcome.isError,
      });
    }
    messages.push({ role: "user", content: results });
    // Whatever the model says next is a new paragraph after any text it already streamed.
    paragraphBreakPending = true;
  }

  paragraphBreakPending = true;
  emit(FALLBACK_REPLY);
  return finish();
}
