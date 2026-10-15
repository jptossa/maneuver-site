import Anthropic from "@anthropic-ai/sdk";
import { CHATBOT_MODEL, LIMITS, REPRESENTATIVE } from "./config";
import { buildSystemPrompt } from "./prompt";
import { SIGNED_IN_TOOLS, loadHistorySnapshot, runTool } from "./tools";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AgentReply {
  reply: string;
  /** True if the assistant logged or planned something this turn. */
  wrote: boolean;
}

const FALLBACK_REPLY = `I'm going to hand this one to a human. ${REPRESENTATIVE.name} (${REPRESENTATIVE.title}, ${REPRESENTATIVE.base}) can be reached at ${REPRESENTATIVE.phone}.`;

/**
 * Runs one assistant turn: sends the conversation to Claude and, for signed-in
 * users, keeps executing the tools it asks for until it produces a final answer.
 * Only plain text turns are stored by the client, so tool calls and thinking
 * blocks live and die inside this function.
 */
export async function runAgent(opts: {
  history: ChatTurn[];
  signedIn: boolean;
  today?: Date;
}): Promise<AgentReply> {
  const today = opts.today ?? new Date();
  const client = new Anthropic();
  const snapshot = opts.signedIn ? await loadHistorySnapshot(today) : undefined;
  const system = buildSystemPrompt({ signedIn: opts.signedIn, today, snapshot });
  const tools = opts.signedIn ? SIGNED_IN_TOOLS : undefined;
  const messages: Anthropic.MessageParam[] = opts.history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let wrote = false;

  for (let round = 0; round < LIMITS.maxToolRounds; round++) {
    const response = await client.messages.create({
      model: CHATBOT_MODEL,
      max_tokens: LIMITS.maxTokens,
      system,
      tools,
      messages,
      // Short conversational replies don't need deep reasoning; keep it quick and cheap.
      output_config: { effort: "low" },
    });

    if (response.stop_reason === "refusal") {
      return { reply: FALLBACK_REPLY, wrote };
    }

    const toolCalls = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );

    if (response.stop_reason !== "tool_use" || toolCalls.length === 0) {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return { reply: text || FALLBACK_REPLY, wrote };
    }

    // Echo the whole assistant turn (including thinking blocks), then answer every tool call at once.
    messages.push({ role: "assistant", content: response.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const call of toolCalls) {
      const outcome = await runTool(call.name, call.input, today);
      wrote ||= outcome.wrote === true;
      results.push({
        type: "tool_result",
        tool_use_id: call.id,
        content: outcome.content,
        is_error: outcome.isError,
      });
    }
    messages.push({ role: "user", content: results });
  }

  return { reply: FALLBACK_REPLY, wrote };
}
