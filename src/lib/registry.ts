import { IXS_VAULT_NAME, dataStatus, REGISTRY_MAX_AGE, TERMS_MAX_AGE } from "./data-status";

// VaultTerms registry — the hand-verified terms layer (vaultterms.com).
// Same data both sites use; refreshed daily by the VaultTerms cron.

export const REGISTRY_URL =
  process.env.REGISTRY_URL ?? "https://vaultterms.com/registry/vaults.enriched.json";

export type KycTier = "none" | "kyc_retail" | "accredited" | "qualified_purchaser" | "institutional_only";

export interface Vault {
  id: string;
  name: string;
  issuer: string;
  asset_class: string;
  underlying: string;
  tokens: string[];
  chains: string[];
  terms: {
    min_investment: string;
    kyc: KycTier;
    jurisdiction: string;
    redemption: string;
    lockup: string;
    fees: string;
  };
  access: {
    retail_accessible: boolean;
    how_to_invest: { method: string; url: string }[];
    regions: { us: boolean; eu: boolean; row: boolean; note?: string };
    min_usd: number;
    agent_addressable?: boolean;
  };
  yield_profile?: { target_pct?: number; trailing_12m_pct?: number; guaranteed?: boolean; note?: string };
  promotions?: { name: string; badge?: string; window: { start: string; end: string }; mechanic: string; tiers?: unknown[]; caveats?: string }[];
  live?: { tvl_usd: number | null; apy_pct: number | null; as_of: string; apy_check_asksurf?: number };
  risk_notes: string;
  sources: string[];
  status?: string;
  verified_at: string;
}

export const KYC_RANK: Record<KycTier, number> = {
  none: 0,
  kyc_retail: 1,
  accredited: 2,
  qualified_purchaser: 3,
  institutional_only: 3,
};

let cached: { at: number; vaults: Vault[] } | null = null;
const TTL_MS = 10 * 60_000;

export async function loadRegistry(): Promise<Vault[]> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.vaults;
  const res = await fetch(REGISTRY_URL, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`registry fetch failed (${res.status})`);
  const vaults = (await res.json()) as Vault[];
  cached = { at: Date.now(), vaults };
  return vaults;
}

export function apyOf(v: Vault): { n: number | null; tag: string } {
  if (v.yield_profile?.target_pct != null) return { n: v.yield_profile.target_pct, tag: "target" };
  if (v.live?.apy_pct != null) return { n: Math.round(v.live.apy_pct * 100) / 100, tag: "reported" };
  return { n: null, tag: "" };
}

export function activePromo(v: Vault) {
  const today = new Date().toISOString().slice(0, 10);
  return v.promotions?.find((p) => p.window && p.window.start <= today && today <= p.window.end) ?? null;
}

export interface EligibilityQuery {
  region?: "us" | "eu" | "row";
  max_ticket_usd?: number;
  kyc_tolerance?: KycTier | "agent";
  asset_class?: string;
}

// Mirrors the eligibility desk on vaultterms.com: admission at any tier for the
// region, minimum within budget, KYC tier at or below tolerance. "agent" means
// the caller is an autonomous agent: only agent-addressable rails qualify.
export function eligible(v: Vault, q: EligibilityQuery): boolean {
  if (v.status === "wound_down" || v.id === "goldfinch-prime") return false;
  if (q.asset_class && v.asset_class !== q.asset_class) return false;
  if (q.region && !v.access.regions?.[q.region]) return false;
  if (q.max_ticket_usd != null && (v.access.min_usd ?? 0) > q.max_ticket_usd) return false;
  if (q.kyc_tolerance === "agent") return !!v.access.agent_addressable;
  if (q.kyc_tolerance) {
    const ok = KYC_RANK[v.terms.kyc] <= KYC_RANK[q.kyc_tolerance];
    const agentPass = q.kyc_tolerance === "none" && !!v.access.agent_addressable;
    if (!ok && !agentPass) return false;
  }
  return true;
}

// Compact shape for the model — full terms are one tool call away (vault_terms).
export function summarize(v: Vault) {
  const apy = apyOf(v);
  const promo = activePromo(v);
  return {
    id: v.id,
    name: v.id === "ixs-blackrock-hy-bond" ? IXS_VAULT_NAME : v.name,
    asset_class: v.asset_class,
    underlying: v.underlying,
    chains: v.chains,
    kyc: v.terms.kyc,
    agent_addressable: !!v.access.agent_addressable,
    min_usd: v.access.min_usd ?? 0,
    admits: v.access.regions,
    yield: apy.n != null ? `${apy.n}% (${apy.tag})` : "n/a",
    yield_status: dataStatus(apy.n, apy.tag === "target" ? v.verified_at : v.live?.as_of, apy.tag === "target" ? TERMS_MAX_AGE : REGISTRY_MAX_AGE, Date.now()),
    yield_updated_at: apy.tag === "target" ? v.verified_at : v.live?.as_of ?? null,
    source: "VaultTerms",
    tvl_usd: v.live?.tvl_usd ?? null,
    tvl_status: dataStatus(v.live?.tvl_usd, v.live?.as_of, REGISTRY_MAX_AGE, Date.now()),
    tvl_updated_at: v.live?.as_of ?? null,
    status: v.status ?? "active",
    promo: promo ? `${promo.name} until ${promo.window.end}` : null,
    invest_url: v.access.how_to_invest?.[0]?.url ?? null,
  };
}
