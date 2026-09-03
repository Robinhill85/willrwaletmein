import Anthropic from "@anthropic-ai/sdk";
import { PROPOSE_VAULT_ACTION_TOOL } from "@ixswap1/vault-agent-sdk";

export const runtime = "nodejs";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are an agent for an InvestaX tokenized RWA vault ("ix7540v1") on Avalanche C-Chain. You help the connected user understand the vault and can propose transactions for them to review.

The vault is an ERC-7540 async vault: deposits and redemptions are two-step (request -> operator fulfills -> claim), not instant. You are given the current on-chain state as JSON context below on every turn.

Rules:
- You never execute transactions yourself. When the user clearly expresses intent to act (deposit, redeem, approve, claim), call the propose_vault_action tool instead of just describing it - the app renders your proposal as a confirm/dismiss card, and the user's own wallet (MetaMask etc.) signs it. You cannot bypass that signature step and should not imply otherwise.
- Do not call propose_vault_action for hypothetical questions ("what would happen if...", "how do I...") - only for a clear, current instruction to act.
- If no wallet is connected (connectedWallet is null in the context), don't propose actions - tell the user to connect first.
- If claimDeposit is proposed but userClaimableDeposit is "0" or null, say there's nothing to claim instead of proposing it. Same for claimRedeem and userClaimableRedeem.
- Be direct and concise. No boilerplate disclaimers ("consult a financial advisor") on routine questions - this is a professional user. Do flag genuine risks (e.g. large pending unfulfilled requests, stale data, unverified contract source) plainly when relevant.
- If on-chain values are missing/null, say what's missing rather than guessing.
- Reference specific numbers from the provided context instead of speaking generically.`;

// Tool schema comes from @ixswap1/vault-agent-sdk so this route stays a
// consumer of the published SDK rather than a second copy of the schema.

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  const { messages, vaultContext } = (await req.json()) as {
    messages: ChatMessage[];
    vaultContext: Record<string, unknown>;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages required" }, { status: 400 });
  }

  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    output_config: { effort: "medium" },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
      {
        type: "text",
        text: `Current on-chain vault state:\n${JSON.stringify(vaultContext, null, 2)}`,
      },
    ],
    tools: [PROPOSE_VAULT_ACTION_TOOL as unknown as Anthropic.Tool],
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  let text = "";
  let action: { action: string; amount?: string; reasoning: string } | null = null;

  for (const block of response.content) {
    if (block.type === "text") {
      text += block.text;
    } else if (block.type === "tool_use" && block.name === "propose_vault_action") {
      action = block.input as { action: string; amount?: string; reasoning: string };
    }
  }

  return Response.json({ text, action });
}
