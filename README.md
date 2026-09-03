# IXS Vault Agent

A reference implementation of [`@ixswap1/vault-agent-sdk`](https://www.npmjs.com/package/@ixswap1/vault-agent-sdk) — an agent dashboard for the InvestaX `ix7540v1` tokenized RWA vault ([`0xaD01573b459805E3954398796203d830B57A8bD9`](https://snowtrace.io/address/0xaD01573b459805E3954398796203d830B57A8bD9)) on Avalanche C-Chain. Connect a wallet, ask the agent about the vault, and have it draft ERC-7540 deposit/redeem requests for you to sign — nothing more, nothing less.

## The proposition

This repo is a sample app, not the reusable part. The reusable part — correct ERC-7540 reads, correct requestId resolution, unsigned transaction builders, and a provider-agnostic agent tool schema — lives in [`@ixswap1/vault-agent-sdk`](https://www.npmjs.com/package/@ixswap1/vault-agent-sdk), published to npm so any agent builder (not just this app, not just Claude) can `npm install` it instead of rediscovering ERC-7540's quirks from scratch. This app exists to prove the SDK actually works end to end and to give people something to copy from.

## What this is

- **Non-custodial.** Neither this app nor the SDK ever holds a private key. The SDK's transaction builders return unsigned call data only; every transaction is signed by your own connected wallet (MetaMask, Rainbow, Coinbase Wallet, WalletConnect).
- **Chat + direct helpers, same underlying calls.** You can either ask the agent in plain language ("deposit 500") or use the "Request deposit" / "Request redeem" forms directly — both call the identical `@ixswap1/vault-agent-sdk` transaction builders.
- **ERC-7540 aware.** The vault is an async tokenized vault: deposits and redemptions go through a request → operator fulfillment → claim flow, not an instant swap, and `requestId` increments per request rather than always being `0` — the SDK resolves it from a subgraph rather than assuming.
- **Powered by Claude Sonnet 5** (Anthropic) for the advisory/tool-use layer — but the SDK's tool schema itself has no Anthropic dependency, so swapping in another LLM provider doesn't touch the SDK.

## Skills

Built with reference to the IXS Skills API — [`api-v2.ixs.finance/docs#/skills`](https://api-v2.ixs.finance/docs#/skills). Manifests live in [`skills/`](skills/):

| Skill | Purpose |
| --- | --- |
| [`vault.read`](skills/vault-read/SKILL.md) | Read vault state (TVL, share price, user position, pending/claimable requests) |
| [`vault.context`](skills/vault-context/SKILL.md) | Assemble live on-chain state into agent context on every turn |
| [`vault.proposeAction`](skills/vault-propose-action/SKILL.md) | Draft a `requestDeposit` / `requestRedeem` / `approve` / `claim` for user signature |

> Each manifest maps to real code (linked from `skills/README.md`) — as of the SDK migration, that's mostly `@ixswap1/vault-agent-sdk` itself, with this app as the consumer.

## Getting started

```bash
npm install
cp .env.local.example .env.local
```

Fill in `.env.local`:

| Variable | Where to get it |
| --- | --- |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | [cloud.reown.com](https://cloud.reown.com) (free) |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |

No subgraph URL needed — `@ixswap1/vault-agent-sdk` ships the known vault's config (address + subgraph endpoint) via its `KNOWN_VAULTS` registry.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

- **Next.js 16** (App Router, TypeScript, Tailwind)
- **wagmi + viem + RainbowKit** for wallet connection, scoped to Avalanche C-Chain
- **[`@ixswap1/vault-agent-sdk`](https://www.npmjs.com/package/@ixswap1/vault-agent-sdk)** for the vault ABI, requestId resolution against the subgraph, and unsigned transaction builders — this app supplies the RPC client (via wagmi), the signer (via the connected wallet), and the LLM call; the SDK supplies none of those
- **`/api/agent`** — a server route that calls Claude with live vault state injected as context and the SDK's `PROPOSE_VAULT_ACTION_TOOL`; the client renders any proposal as a confirm/dismiss card, and on confirm calls the SDK's matching `build*Tx` function before handing it to `writeContract`

## Disclaimer

This is a sample/reference implementation, not audited, and not a recommendation to deposit funds. Verify the vault's contract source and the agent's tool-call behavior yourself before connecting a wallet with real funds. See [LICENSE](LICENSE).

## License

[MIT](LICENSE) © InvestaX
