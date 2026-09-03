# CoinMarketCap API — evidence of real calls

Hackathon requirement: *"visible evidence of a real API call: code and response."*
All calls below were made on 2026-09-03 with a hackathon Startup-tier key (never committed; see `.env.local.example`).
Base URL `https://pro-api.coinmarketcap.com`, header `X-CMC_PRO_API_KEY`.

## The client (src/lib/cmc.ts)

```ts
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
  if (!res.ok || (body?.status?.error_code ?? 0) !== 0) {
    throw new CmcError(
      body?.status?.error_message || `CMC request failed (${res.status})`,
      res.status,
    );
  }
  cache.set(cacheKey, { at: Date.now(), body });
  return body as T;
}
```

The agent route returns every call it made as `cmc_calls` (endpoint, params, HTTP status, credit_count, elapsed ms) so the evidence is visible per answer, not just in this file.

## GET /v5/real-world-assets/assets/list?asset_type=stock&limit=5&sort=tokenized_market_cap

```json
{
  "status": {
    "timestamp": "2026-09-03T23:03:04.426Z",
    "error_code": "0",
    "error_message": "",
    "elapsed": 11,
    "credit_count": 1
  },
  "data": {
    "total_size": 4811,
    "has_more": true,
    "rwa_assets": [
      {
        "name": "Intercontinental Exchange Inc.",
        "symbol": "ICE",
        "rwa_id": 407,
        "asset_type": "stock",
        "rwa_rank": 188,
        "average_tokenized_price": 164.12389870090274,
        "tokenized_market_cap": 0,
        "tokenized_volume_24h": 46271.04959357
      },
      {
        "name": "Cloudflare, Inc.",
        "symbol": "NET",
        "rwa_id": 281,
        "asset_type": "stock",
        "rwa_rank": 173,
        "average_tokenized_price": 284.2368978079498,
        "tokenized_market_cap": 0,
        "tokenized_volume_24h": 0
      },
      {
        "name": "Flex Ltd.",
        "symbol": "FLEX",
        "rwa_id": 316,
        "asset_type": "stock",
        "rwa_rank": 392,
        "average_tokenized_price": 105.98421347055404,
        "tokenized_market_cap": 0,
        "tokenized_volume_24h": 0
      }
    ]
  }
}
```

## GET /v5/real-world-assets/quotes/latest?symbol=NVDA,GOLD

The field that makes the premium/discount answer possible: `tokens[]` carries each issuer's tokenized price alongside the aggregate `average_tokenized_price`.

```json
{
  "status": {
    "timestamp": "2026-09-03T23:03:06.642Z",
    "error_code": "0",
    "error_message": "",
    "elapsed": 7,
    "credit_count": 1
  },
  "data": {
    "rwa_assets": [
      {
        "name": "Nvidia Corp",
        "symbol": "NVDA",
        "asset_type": "stock",
        "rwa_rank": 2,
        "average_tokenized_price": 228.99989507229935,
        "tokenized_market_cap": 112035199.62600133,
        "tokenized_volume_24h": 140470349.65862167,
        "last_updated": "2026-09-03T23:02:33.549Z",
        "tokens": [
          {
            "symbol": "NVDAX",
            "name": "NVIDIA tokenized stock (xStock)",
            "issuer_name": "Backed Assets",
            "price": 229.37936191809612,
            "market_cap": 39866974.56
          },
          {
            "symbol": "NVDA.D",
            "name": "NVIDIA tokenized stock (Dinari)",
            "issuer_name": "Dinari Assets",
            "price": null,
            "market_cap": null
          },
          {
            "symbol": "NVDAon",
            "name": "NVIDIA Tokenized Stock (Ondo)",
            "issuer_name": "Ondo Assets",
            "price": 229.25821880687764,
            "market_cap": 38695263.45
          },
          {
            "symbol": "NVDA",
            "name": "NVIDIA (Derivatives)",
            "issuer_name": "NA (Derivatives)",
            "price": 229.43169440062837,
            "market_cap": 0
          }
        ]
      }
    ]
  }
}
```

## GET /v5/real-world-assets/issuers/list?limit=5&active=true

```json
{
  "status": {
    "timestamp": "2026-09-03T23:03:08.491Z",
    "error_code": "0",
    "error_message": "",
    "elapsed": 4,
    "credit_count": 1
  },
  "data": {
    "total_size": 24,
    "issuers": [
      {
        "name": "Backed Assets",
        "website": "https://assets.backed.fi/",
        "issuer_id": "6878977dcbbf471de3366e85",
        "num_tokens": 976
      },
      {
        "name": "Backpack",
        "website": "https://backpack.exchange",
        "issuer_id": "6a2d54b697c45356b1a634f4",
        "num_tokens": 5
      },
      {
        "name": "bStocks",
        "website": null,
        "issuer_id": "6a2aed5097c45356b1a5f710",
        "num_tokens": 72
      },
      {
        "name": "Coinbase",
        "website": "https://www.coinbase.com/en-sg/tokenize",
        "issuer_id": "6a72fe7072996604d45c6733",
        "num_tokens": 0
      }
    ]
  }
}
```

## Also used

- `GET /v5/real-world-assets/info?symbol=NVDA` — 200, 1 credit: company metadata (industry, employees, founded, SEC CIK, long-form description).
- `GET /v5/real-world-assets/map` — 200, 0 credits: id map.
- `GET /v5/real-world-assets/issuers?issuer_id=…` — single issuer with all issued tokens (used by the agent's issuer explorer tool).

## Observations for the CMC product team

- Every RWA endpoint costs exactly 1 credit per call (map: 0) — cheap enough to call on every agent turn.
- `tokenized_market_cap` is frequently `0` for assets that clearly trade (e.g. ICE with $46k 24h volume) — looks like a coverage/aggregation gap rather than a true zero.
- There is no yield/APY, no TVL and no vault-level object; tokenized *funds* (BUIDL, USDY, JTRSY) are thin relative to tokenized equities. Eligibility and yield therefore still come from our own registry + DeFiLlama.
- `market-pairs/list` is Growth-tier only, so venue-level liquidity was out of reach on the Startup tier.
