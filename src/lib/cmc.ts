// CoinMarketCap Pro API — Real-World Assets endpoints (v5).
// Docs: https://coinmarketcap.com/api/documentation/pro-api-reference/real-world-assets
// Server-side only: the key never reaches the browser.

const BASE = "https://pro-api.coinmarketcap.com";

export type RwaAssetType =
  | "stock"
  | "commodity"
  | "currency"
  | "government_security"
  | "etf"
  | "real_estate";

export const RWA_ENDPOINTS = {
  map: "/v5/real-world-assets/map",
  info: "/v5/real-world-assets/info",
  list: "/v5/real-world-assets/assets/list",
  quotes: "/v5/real-world-assets/quotes/latest",
  issuersList: "/v5/real-world-assets/issuers/list",
  issuer: "/v5/real-world-assets/issuers",
} as const;

export type CmcCall = {
  endpoint: string;
  params: Record<string, string>;
  status: number;
  creditCount?: number;
  elapsedMs?: number;
};

// Small in-process cache: serverless instances are short-lived, but within one
// instance the agent often asks the same thing twice in a conversation.
const cache = new Map<string, { at: number; body: unknown }>();
const TTL_MS = 60_000;

export class CmcError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function cmcGet<T = unknown>(
  endpoint: string,
  params: Record<string, string>,
  log?: CmcCall[],
): Promise<T> {
  const key = process.env.CMC_API_KEY;
  if (!key) throw new CmcError("CMC_API_KEY is not configured on the server", 0);

  const qs = new URLSearchParams(params).toString();
  const url = `${BASE}${endpoint}${qs ? `?${qs}` : ""}`;
  const cacheKey = url;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL_MS) {
    log?.push({ endpoint, params, status: 200, elapsedMs: 0 });
    return hit.body as T;
  }

  const t0 = Date.now();
  const res = await fetch(url, {
    headers: { "X-CMC_PRO_API_KEY": key, Accept: "application/json" },
    // Route handlers should not let Next cache upstream market data.
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as {
    status?: { error_code?: number; error_message?: string; credit_count?: number };
  };
  log?.push({
    endpoint,
    params,
    status: res.status,
    creditCount: body?.status?.credit_count,
    elapsedMs: Date.now() - t0,
  });
  // CMC serialises error_code as a string ("0"), so compare numerically.
  if (!res.ok || Number(body?.status?.error_code ?? 0) !== 0) {
    throw new CmcError(
      body?.status?.error_message || `CMC request failed (${res.status})`,
      res.status,
    );
  }
  cache.set(cacheKey, { at: Date.now(), body });
  return body as T;
}

export function rwaList(opts: { asset_type?: RwaAssetType; limit?: number; sort?: string }, log?: CmcCall[]) {
  const params: Record<string, string> = { limit: String(Math.min(opts.limit ?? 25, 100)) };
  if (opts.asset_type) params.asset_type = opts.asset_type;
  if (opts.sort) params.sort = opts.sort;
  return cmcGet(RWA_ENDPOINTS.list, params, log);
}

export function rwaQuotes(symbols: string[], log?: CmcCall[]) {
  return cmcGet(RWA_ENDPOINTS.quotes, { symbol: symbols.join(","), skip_invalid: "true" }, log);
}

export function rwaInfo(symbols: string[], log?: CmcCall[]) {
  return cmcGet(RWA_ENDPOINTS.info, { symbol: symbols.join(","), skip_invalid: "true" }, log);
}

export function rwaIssuers(opts: { issuer_id?: string; limit?: number }, log?: CmcCall[]) {
  if (opts.issuer_id) return cmcGet(RWA_ENDPOINTS.issuer, { issuer_id: opts.issuer_id, limit: "100" }, log);
  return cmcGet(RWA_ENDPOINTS.issuersList, { limit: String(Math.min(opts.limit ?? 50, 250)), active: "true" }, log);
}

// Keep tool results small enough for the model: cap serialized size.
export function compact(value: unknown, max = 7000): string {
  const s = JSON.stringify(value);
  return s.length <= max ? s : s.slice(0, max) + `…[truncated ${s.length - max} chars]`;
}
