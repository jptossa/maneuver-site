import type Anthropic from "@anthropic-ai/sdk";

export const ESCALATE_TOOL_NAME = "escalate_difficult_question";

/**
 * Offered only to the default model. The agent handles this call itself (it is
 * not a data tool): it claims one of the day's escalations and, if granted,
 * re-runs the turn on the stronger model.
 */
export const ESCALATE_TOOL: Anthropic.Tool = {
  name: ESCALATE_TOOL_NAME,
  description:
    "Hand the person's latest message to a stronger, slower model. Use it only for a genuinely difficult question where a quick answer would likely be shallow or wrong. Call it on its own, immediately, before writing any text or calling any other tool. The stronger model then answers the whole message. Uses are rationed across the whole site, so when in doubt, answer yourself.",
  input_schema: {
    type: "object",
    properties: {
      reason: {
        type: "string",
        description: "One short sentence: why this needs the stronger model.",
      },
    },
    required: ["reason"],
  },
};
