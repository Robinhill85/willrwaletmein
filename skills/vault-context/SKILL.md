---
name: vault.context
description: Assemble the results of vault.read into a flat JSON object injected as agent context on every chat turn, so responses are grounded in current on-chain state rather than the model's training data.
reference: https://api-v2.ixs.finance/docs#/skills
implementation: src/app/page.tsx
---

# vault.context

Runs client-side after `vault.read` resolves (now via `@ixswap1/vault-agent-sdk`'s ABI and requestId resolution). No network calls of its own — it's a pure reshape of already-fetched `wagmi`/`viem` read results into the object the agent route consumes, formatted to human-readable decimal strings for the LLM.

## Shape

```json
{
  "vaultAddress": "0xaD01573b459805E3954398796203d830B57A8bD9",
  "chain": "Avalanche C-Chain",
  "standard": "ERC-7540 async vault",
  "vaultName": "string | null",
  "vaultSymbol": "string | null",
  "assetAddress": "string | null",
  "assetSymbol": "string | null",
  "totalAssets": "string | null",
  "totalShares": "string | null",
  "connectedWallet": "string | null",
  "userAssetBalance": "string | null",
  "userShareBalance": "string | null",
  "userPendingDepositRequest": "string | null",
  "userClaimableDeposit": "string | null",
  "userPendingRedeemRequest": "string | null",
  "userClaimableRedeem": "string | null"
}
```

`null` means the value has not loaded yet (or no wallet is connected) — the agent is instructed to say so rather than guess.

## Why this exists as its own skill

Separating "what's true right now" (this skill) from "what should we do about it" (`vault.proposeAction`) keeps the read path free of side effects and lets either be swapped independently — e.g. a future version could source this from an indexer instead of direct RPC reads without touching the agent route.
