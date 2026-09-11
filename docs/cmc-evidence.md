# Real CoinMarketCap API call evidence

Captured on 11 September 2026. The [full request/response file](evidence/cmc-live.json) preserves CMC's response timestamps, status objects and data. Keys and authentication values are excluded. These are successful network calls, not fabricated fixtures.

- [Application client](../src/lib/cmc.ts)
- [Runnable capture script](../scripts/capture-cmc-evidence.mjs)
- [Full request and response JSON](evidence/cmc-live.json)

All paths below are GET requests under `https://pro-api.coinmarketcap.com` with the `X-CMC_PRO_API_KEY` header. The evidence records the exact parameters and reported credits; a cached upstream response may report zero credits.

| Endpoint | Purpose |
|---|---|
| `/v5/real-world-assets/assets/list` | Category listings, explicitly sorted by descending tokenized market cap |
| `/v5/real-world-assets/quotes/latest` | Underlying and per-issuer wrapper prices; compare with the blended tokenized average |
| `/v5/real-world-assets/issuers/list` | Issuer discovery and linked-token counts |
| `/v5/real-world-assets/info` | Company and asset metadata |
| `/v5/real-world-assets/issuers` | One issuer and its issued tokens |

Reproduce from the repository root with a configured `.env.local`:

```bash
node --env-file=.env.local --experimental-transform-types scripts/capture-cmc-evidence.mjs
```

The script invokes the application's own client. `/api/agent` also returns `cmc_calls` (endpoint, params, status, credits, elapsed time) with each answer. Source chips identify CMC in the chat UI; inspect the response in the Network panel to see the call log.

## What CMC made possible

Issuer discovery, tokenized category comparisons, and per-issuer wrapper pricing that can be placed beside the verified access terms.

## Where it got in the way

- A tokenized blended price is not a primary-exchange stock quote. Do not label the wrapper comparison as verified NASDAQ arbitrage.
- The RWA data does not supply the vault admission terms, minimum investment, redemption mechanics, APY or onchain vault TVL; those use the registry and separate sources.
- Missing values must stay unknown. Different token units can produce large apparent gold-price deviations; the dashboard excludes deviations of 20% or more rather than advertising them as opportunities. This is a heuristic, not unit normalization.
- CMC's success code can be the string `"0"`. The client accepts it numerically.
- Category rankings must include `sort_dir=desc`. The agent and daily pipeline now do so.
- Coverage and endpoint access depend on the plan. Check access again before recording and keep the demo funded through judging.
