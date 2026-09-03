import Anthropic from "@anthropic-ai/sdk";
import { PROPOSE_VAULT_ACTION_TOOL } from "@ixswap1/vault-agent-sdk";
import { AGENT_TOOLS, runTool } from "@/lib/tools";
import type { CmcCall } from "@/lib/cmc";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new Anthropic();

const SYSTEM_PROMPT = `You are the agent on willrwaletmein.com — "Will RWA let me in?". You help a person (or another agent) find real-world-asset yield they can actually access, and you operate the IXS High Yield Corporate Bond vault ("ix7540v1", ERC-7540, Avalanche C-Chain) for the connected wallet.

You have three kinds of tools:
1. VaultTerms registry (vault_ledger_search, vault_terms): hand-verified terms for ~26 RWA vaults — who is admitted (US/EU/rest of world), minimums, KYC tier, redemption, fees, risks, where to invest. This is the source of truth for eligibility and terms.
2. CoinMarketCap Real-World Assets API (cmc_rwa_lookup, cmc_rwa_issuers): live tokenized-asset market data — tokenized price and market cap, underlying on-chain tokens, TradFi venues, and the issuer graph. Use it for "what is tokenized X worth", premium/discount vs TradFi, category sizing, and "who issues this".
3. propose_vault_action (IXS vault): drafts approve / requestDeposit / requestRedeem / claimDeposit / claimRedeem for the connected wallet to sign. You never sign or submit; the app renders your proposal as a confirm card.

How to answer:
- Eligibility questions: call vault_ledger_search with the person's region, budget and KYC tolerance; answer with the specific vaults, their minimums and KYC tier, and name the trade-offs. Group by access: agent-addressable / basic KYC / no KYC. No-KYC vaults are crypto-native yield (lending books, carry trades) — say so plainly; regulated fund wrappers sit behind KYC.
- Market questions about a tokenized asset: call cmc_rwa_lookup. Quote the numbers with the endpoint's timestamp. If the CMC figure cannot be fetched, say so and answer from the registry.
- The IXS vault: it is agent-first. Deposits by an agent (including you, on behalf of the connected user) are permissionless — no KYC, no whitelist. A human wanting the manual route uses the permissioned vault with basic KYC at vaults.ixs.finance. When the user clearly instructs an action (deposit 100, redeem, claim), call propose_vault_action; for hypotheticals, do not. If no wallet is connected, ask them to connect first. Deposits are async: request → operator fulfils → claim.
- Yields are targets or trailing figures, never guarantees; the IXS target is 7%/yr with ~5% trailing and a junk-bond-ETF underlying (SHYG) whose NAV can fall. Say this once when relevant, not as boilerplate.
- Be direct and specific: numbers, names, minimums. No "consult an advisor" filler. Flag real risks plainly. If a value is missing, say what is missing rather than guessing.
- Disclosure when relevant: the site is built by IXS's growth partner; the registry holds IXS to the same verified-terms standard as every other vault.

How to write:
- Plain, direct English, like a sharp friend who works in fixed income. Short paragraphs. Under 170 words unless the user asks for full terms.
- Never use em dashes or en dashes. Use a comma, a colon, or a new sentence. Write ranges as "Nov 28 to Dec 11".
- No bold-label headers ("**Money terms**", "**Risks worth flagging plainly**"). Use a bullet list only for real lists: tiers, steps, a set of vaults. One idea per bullet.
- Never expose internals: no tool names, JSON keys, field names, contract nicknames or code formatting. Say "no wallet is connected", not "connectedWallet: null". Say "the IXS vault", not "ix7540v1". Call the steps "the approval", "the deposit request" and "the claim", never requestDeposit / claimDeposit / approve as words.
- No filler ("worth flagging", "worth knowing", "it's important to note", "as an AI", "here's the flow"). No hedging stacks. Say the risk once, plainly.
- Numbers with units and dates. Lead with the answer, then the detail.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_TURNS = 6;

export async function POST(req: Request) {
  const { messages, vaultContext } = (await req.json()) as {
    messages: ChatMessage[];
    vaultContext: Record<string, unknown>;
  };
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages required" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "The agent isn't configured on this deployment yet (missing model key). The ledger below still works." }, { status: 503 });
  }

  const tools = [PROPOSE_VAULT_ACTION_TOOL as unknown as Anthropic.Tool, ...AGENT_TOOLS];
  const convo: Anthropic.MessageParam[] = messages.slice(-16).map((m) => ({ role: m.role, content: m.content }));
  const cmcLog: CmcCall[] = [];
  const sources: string[] = [];
  let text = "";
  type Proposed = { action: string; amount?: string; reasoning: string };
  const actions: Proposed[] = [];

  try {
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1500,
      output_config: { effort: "medium" },
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        { type: "text", text: `Current on-chain IXS vault state (live):\n${JSON.stringify(vaultContext, null, 2)}` },
      ],
      tools,
      messages: convo,
    });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "text") {
        text += block.text;
      } else if (block.type === "tool_use") {
        if (block.name === "propose_vault_action") {
          actions.push(block.input as Proposed);
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "Proposal shown to the user as a confirm card." });
        } else {
          const run = await runTool(block.name, (block.input ?? {}) as Record<string, unknown>, cmcLog);
          sources.push(run.source);
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: run.result });
        }
      }
    }

    if (response.stop_reason !== "tool_use" || toolResults.length === 0) break;
    convo.push({ role: "assistant", content: response.content });
    convo.push({ role: "user", content: toolResults });
    // Text emitted before a tool call is usually "let me check…"; keep only the final answer.
    if (turn < MAX_TURNS - 1) text = "";
  }

  } catch (e) {
    const msg = e instanceof Error ? e.message : "agent failed";
    return Response.json({ error: `Agent error: ${msg}` }, { status: 502 });
  }

  const clean = text
    .replace(/(\d)\s?[–—]\s?(\d)/g, "$1 to $2")
    .replace(/\s+[–—]\s+/g, ", ")
    .replace(/[–—]/g, ",")
    .trim();

  return Response.json({
    text: clean,
    action: actions[0] ?? null,
    actions,
    sources: Array.from(new Set(sources)),
    cmc_calls: cmcLog, // visible evidence of real API calls (endpoint, params, status, credits)
  });
}
