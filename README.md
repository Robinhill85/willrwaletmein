# Will RWA let me in? — willrwaletmein.com

**An agent that answers the only question that matters about real-world-asset yield — "will they let *me* in?" — with CoinMarketCap RWA data and hand-verified vault terms, and then deposits into the IXS agent-first vault from your own wallet.**

Built for the **#BuildwithCMC API Hackathon** (track: AI Agents and Automation). Live at [willrwaletmein.com](https://willrwaletmein.com). Sister project: [VaultTerms](https://github.com/Robinhill85/vaultterms) (Real World Assets track) — the verified-terms registry this agent reads.

## What it does

Ask in plain language:

- *"I'm in the EU with $1,000 and I'll do basic KYC — which vaults will let me in?"* → the agent searches the VaultTerms registry (26 hand-verified RWA vaults: minimums, KYC tier, jurisdictions, redemption, fees) and answers with specific vaults, grouped by access.
- *"Is tokenized NVDA trading at a premium to the real stock?"* → the agent calls the CoinMarketCap Real-World Assets API for the tokenized quote, its underlying on-chain tokens and the TradFi venue, and compares.
- *"Which issuers tokenize gold, and how big is each?"* → CMC issuer explorer + asset list.
- *"Deposit 100 USDC"* → the agent drafts an ERC-7540 `requestDeposit` for the **IXS High Yield Corporate Bond vault** on Avalanche using `@ixswap1/vault-agent-sdk`; you confirm in your wallet. The agent never holds keys.

Every reply shows its sources (registry / CMC endpoint) as chips, and the API returns the raw CMC call log (`cmc_calls`: endpoint, params, status, credits) as visible evidence.

## CoinMarketCap API endpoints used

All under `https://pro-api.coinmarketcap.com` with the `X-CMC_PRO_API_KEY` header — see [`src/lib/cmc.ts`](src/lib/cmc.ts):

| Endpoint | Used for |
|---|---|
| `GET /v5/real-world-assets/assets/list` | Top tokenized assets by type (`stock`, `commodity`, `currency`, `government_security`, `etf`, `real_estate`) — tokenized market cap, price, 24h volume |
| `GET /v5/real-world-assets/quotes/latest` | Quote by ticker: tokenized aggregate values + underlying on-chain tokens + TradFi markets (premium/discount) |
| `GET /v5/real-world-assets/info` | Static metadata: issuer/company fields, description |
| `GET /v5/real-world-assets/issuers/list` | Issuer explorer: every RWA token issuer CMC tracks with linked-token counts |
| `GET /v5/real-world-assets/issuers` | One issuer with all its issued tokens |

Evidence of real calls (code + response) is in [`docs/cmc-evidence.md`](docs/cmc-evidence.md).

## Architecture

```
browser ── wagmi/RainbowKit (Avalanche) ── your wallet signs
   │
   ├─ reads vault state via @ixswap1/vault-agent-sdk (ERC-7540 requestId from subgraph)
   └─ POST /api/agent  ──► Claude (tool loop)
                              ├─ propose_vault_action   (IXS SDK tool schema → confirm card → build*Tx → writeContract)
                              ├─ vault_ledger_search    (VaultTerms registry: eligibility by region / ticket / KYC)
                              ├─ vault_terms            (full verified terms for one vault)
                              ├─ cmc_rwa_lookup         (CMC RWA quotes / list / info)
                              └─ cmc_rwa_issuers        (CMC RWA issuers)
```

- **Non-custodial.** SDK transaction builders return unsigned call data; RainbowKit/wagmi hand it to the connected wallet.
- **Agent-first vault.** The IXS `ix7540v1` vault ([`0xaD01…8bD9`](https://snowtrace.io/address/0xaD01573b459805E3954398796203d830B57A8bD9)) is permissionless for agents; humans taking the manual route use the permissioned vault with basic KYC at [vaults.ixs.finance](https://vaults.ixs.finance/vaults).
- **Data.** [VaultTerms registry](https://vaultterms.com/registry/vaults.enriched.json) (hand-verified, refreshed daily) + CoinMarketCap RWA API (live).

## Run it

```bash
npm install
cp .env.local.example .env.local   # WalletConnect project id, Anthropic key, CMC API key
npm run dev
```

## What the CMC API made possible — and where it got in the way

**Made possible:** an issuer-centric view of RWAs (who tokenizes what, how many tokens) and a like-for-like tokenized-vs-TradFi price comparison that no yield aggregator offers. The `asset_type` filter gave us clean category sizing for stocks, commodities and ETFs — categories DeFi TVL trackers don't model at all.

**Got in the way:** the RWA endpoints are asset-centric, not vault-centric — there is no yield/APY, no TVL, and no terms (minimums, KYC, redemption), so eligibility and yield still come from our own registry and DeFiLlama. `market-pairs/list` is Growth-tier only, so venue-level liquidity was out of reach on the hackathon Startup tier. Tokenized treasury *funds* (BUIDL, USDY) are underrepresented relative to tokenized equities. A `yield` field and a `vault`/`fund` asset type would make these endpoints the backbone of any RWA product.

## Provenance and disclosure

This repo was seeded from IXS's MIT-licensed [`ixs-sample-vault-agent`](https://github.com/gericix/ixs-sample-vault-agent) (first commit, attributed). Everything after that commit — the CoinMarketCap integration, the VaultTerms tools, the agent loop, and the site — was built for this hackathon. IXS is a client of the author; the registry holds its vault to the same verified-terms standard as every other vault.

**This is information, not advice.** Yields are targets or trailing figures and can be negative. Verify the vault contract yourself before depositing real funds. Not audited.

## License

MIT — see [LICENSE](LICENSE). Sample-app portions © InvestaX; additions © Robin van den Heuvel.
