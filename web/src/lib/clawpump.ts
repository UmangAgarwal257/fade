import { deskChoice, promptLabel, type Prompt } from "./game";

const API_BASE = "https://clawpump.tech/api/v1";
const CHAT_TIMEOUT_MS = 120_000;

export type DeskAgentResult = {
  index: number;
  reason: string;
  source: "clawpump" | "rules";
};

function buildDeskMessage(symbols: string[], prompt: Prompt): string {
  const lines = symbols.map((symbol, i) => `${i}: ${symbol}`).join("\n");
  return [
    promptLabel(prompt),
    "Symbols only — you do not have mark or token prices.",
    lines,
    'Reply with JSON only: {"index":0-3,"reason":"one short sentence"}',
  ].join("\n");
}

function parseAgentJson(content: string): { index?: number; reason?: string } {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed) as { index?: number; reason?: string };
  } catch {
    const block = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    if (block) {
      try {
        return JSON.parse(block.trim()) as { index?: number; reason?: string };
      } catch {
        /* fall through */
      }
    }
    const brace = trimmed.match(/\{[\s\S]*"index"[\s\S]*\}/);
    if (brace) {
      try {
        return JSON.parse(brace[0]) as { index?: number; reason?: string };
      } catch {
        /* fall through */
      }
    }
    throw new Error("Agent did not return JSON");
  }
}

function validatePick(index: number, reason: string, symbols: string[]): DeskAgentResult {
  if (!Number.isInteger(index) || index < 0 || index > 3) {
    throw new Error("Agent pick out of range");
  }
  if (!symbols[index]) throw new Error("Agent pick does not match the hand");
  const text = reason?.trim() || `Taking ${symbols[index]}.`;
  return { index, reason: text, source: "clawpump" };
}

export async function deskPickFromAgent(symbols: string[], prompt: Prompt): Promise<DeskAgentResult> {
  const apiKey = process.env.CLAWPUMP_API_KEY;
  const agentId = process.env.CLAWPUMP_AGENT_ID;
  if (!apiKey || !agentId) {
    const rules = deskChoice(symbols, prompt);
    return { index: rules.index, reason: rules.reason, source: "rules" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/agents/${agentId}/chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: buildDeskMessage(symbols, prompt), temperature: 0 }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const payload = (await response.json().catch(() => ({}))) as {
    content?: string;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error ?? `ClawPump agent error (${response.status})`);
  }
  if (!payload.content) throw new Error("ClawPump agent returned an empty reply");

  const parsed = parseAgentJson(payload.content);
  if (parsed.index === undefined) throw new Error("Agent JSON missing index");
  return validatePick(parsed.index, parsed.reason ?? "", symbols);
}
