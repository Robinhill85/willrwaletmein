// Agent tools beyond the IXS SDK's propose_vault_action:
//  - VaultTerms registry (hand-verified terms + eligibility)
//  - CoinMarketCap RWA endpoints (live tokenized-asset market data, issuers)
// Each tool returns a string for the model plus a source label for the UI.

import { IXS_VAULT_NAME } from "./data-status";
import type Anthropic from "@anthropic-ai/sdk";
import { compact, rwaInfo, rwaIssuers, rwaList, rwaQuotes, type CmcCall, type RwaAssetType, CmcError } from "./cmc";
import { eligible, loadRegistry, summarize, type EligibilityQuery } from "./registry";

export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "vault_ledger_search",
    description:
      "Search the VaultTerms registry of hand-verified real-world-asset vaults (tokenized treasuries, private credit, corporate bonds, gold, tokenized stocks, basis yield, reinsurance). Filters mirror the eligibility desk: who can get in, from where, with how much, at what KYC tier. Returns compact summaries; call vault_terms for full terms of one vault.",
    input_schema: {
      type: "object",
      properties: {
        region: { type: "string", enum: ["us", "eu", "row"], description: "Where the person is. Omit to ignore." },
        max_ticket_usd: { type: "number", description: "Budget in USD; vaults with a higher minimum are excluded." },
        kyc_tolerance: {
          type: "string",
          enum: ["none", "kyc_retail", "accredited", "qualified_purchaser", "agent"],
          description: "Highest KYC tier the person accepts. 'none' = wallet only (agent-addressable rails also pass). 'agent' = the caller is an autonomous agent.",
        },
        asset_class: {
          type: "string",
          enum: ["tokenized_treasuries", "private_credit", "corporate_bonds", "gold", "tokenized_stocks", "basis_yield", "reinsurance"],
        },
        query: { type: "string", description: "Free-text match on name, issuer, tokens or underlying." },
      },
    },
  },
  {
    name: "vault_terms",
    description: "Full verified terms for one vault by id: minimum, KYC, jurisdiction, redemption, lockup, fees, how to invest (URLs), risk notes, sources, active promotions.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string", description: "Vault id from vault_ledger_search, e.g. 'ixs-blackrock-hy-bond'." } },
      required: ["id"],
    },
  },
  {
    name: "cmc_rwa_lookup",
    description:
      "CoinMarketCap Real-World Assets API. Look up tokenized assets by ticker (e.g. NVDA, GOLD, SPY, TSLA) to get average tokenized price, tokenized market cap, 24h volume, the underlying on-chain tokens with their prices, and the TradFi markets where the asset trades — or list top assets of a type (stock, commodity, currency, government_security, etf, real_estate). Use it to compare a tokenized wrapper's price against its TradFi market, size a category, or find which issuers tokenize an asset.",
    input_schema: {
      type: "object",
      properties: {
        symbols: { type: "array", items: { type: "string" }, description: "Tickers to quote, e.g. ['NVDA','GOLD']. Max 10." },
        asset_type: { type: "string", enum: ["stock", "commodity", "currency", "government_security", "etf", "real_estate"] },
        limit: { type: "number", description: "For asset_type listings. Default 15, max 50." },
        include_info: { type: "boolean", description: "Also fetch static metadata (issuer/company fields, description) for the symbols." },
      },
    },
  },
  {
    name: "cmc_rwa_issuers",
    description:
      "CoinMarketCap RWA issuer explorer. Without issuer_id: list token issuers CoinMarketCap tracks (Backed, Ondo, Paxos, ...) with linked-token counts. With issuer_id: one issuer and every token it has issued.",
    input_schema: {
      type: "object",
      properties: {
        issuer_id: { type: "string", description: "24-char hex issuer id from the list call." },
        limit: { type: "number" },
      },
    },
  },
];

export interface ToolRun {
  result: string;
  recoverable?: boolean;
  source: string; // shown in the UI as evidence of where the answer came from
}

export async function runTool(name: string, input: Record<string, unknown>, cmcLog: CmcCall[]): Promise<ToolRun> {
  switch (name) {
    case "vault_ledger_search": {
      const vaults = await loadRegistry();
      const q = input as EligibilityQuery & { query?: string };
      const needle = (q.query ?? "").toLowerCase();
      const hits = vaults
        .filter((v) => eligible(v, q))
        .filter((v) =>
          !needle ||
          [v.name, v.issuer, v.underlying, ...(v.tokens ?? [])].join(" ").toLowerCase().includes(needle),
        )
        .map(summarize);
      return {
        result: compact({ count: hits.length, vaults: hits }, 9000),
        source: `VaultTerms registry · ${hits.length} of ${vaults.length} vaults`,
      };
    }
    case "vault_terms": {
      const vaults = await loadRegistry();
      const v = vaults.find((x) => x.id === input.id);
      if (!v) return { result: `No vault with id ${String(input.id)}`, source: "VaultTerms registry" };
      return { result: compact({ ...v, ...summarize(v) }, 9000), source: `VaultTerms registry · ${v.id === "ixs-blackrock-hy-bond" ? IXS_VAULT_NAME : v.name}` };
    }
    case "cmc_rwa_lookup": {
      try {
        const symbols = ((input.symbols as string[] | undefined) ?? []).slice(0, 10);
        if (symbols.length) {
          const quotes = await rwaQuotes(symbols, cmcLog);
          const info = input.include_info ? await rwaInfo(symbols, cmcLog) : undefined;
          return {
            result: compact({ quotes, info }),
            source: `CMC RWA API · /v5/real-world-assets/quotes/latest${info ? " + /info" : ""}`,
          };
        }
        const list = await rwaList(
          { asset_type: input.asset_type as RwaAssetType | undefined, limit: Number(input.limit ?? 15), sort: "tokenized_market_cap" },
          cmcLog,
        );
        return { result: compact(list), source: "CMC RWA API · /v5/real-world-assets/assets/list" };
      } catch (e) {
        return { result: cmcErr(e), source: "CMC · UNAVAILABLE", recoverable: true };
      }
    }
    case "cmc_rwa_issuers": {
      try {
        const data = await rwaIssuers({ issuer_id: input.issuer_id as string | undefined, limit: Number(input.limit ?? 50) }, cmcLog);
        return {
          result: compact(data),
          source: `CMC RWA API · /v5/real-world-assets/issuers${input.issuer_id ? "" : "/list"}`,
        };
      } catch (e) {
        return { result: cmcErr(e), source: "CMC · UNAVAILABLE", recoverable: true };
      }
    }
    default:
      return { result: `Unknown tool ${name}`, source: "n/a" };
  }
}

function cmcErr(e: unknown): string {
  if (e instanceof CmcError) return `CMC API unavailable: ${e.message}. Answer from the VaultTerms registry instead and say the live CMC figure could not be fetched.`;
  return `Tool failed: ${e instanceof Error ? e.message : String(e)}`;
}
