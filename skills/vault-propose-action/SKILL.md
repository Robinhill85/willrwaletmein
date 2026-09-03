---
name: vault.proposeAction
description: Given a user's stated intent ("deposit 500"), draft a specific vault transaction as a structured proposal for the user to review and sign — the agent never signs or submits it.
reference: https://api-v2.ixs.finance/docs#/skills
implementation: "@ixswap1/vault-agent-sdk" PROPOSE_VAULT_ACTION_TOOL + buildApproveTx/buildRequestDepositTx/buildRequestRedeemTx/buildClaimDepositTx/buildClaimRedeemTx, consumed in src/app/api/agent/route.ts and src/app/page.tsx
---

# vault.proposeAction

A Claude tool (`propose_vault_action`) exposed to the model on `/api/agent`. The tool schema itself is defined once in [`@ixswap1/vault-agent-sdk`](https://www.npmjs.com/package/@ixswap1/vault-agent-sdk) — provider-agnostic, no dependency on the Anthropic SDK — and imported here rather than redefined. The model calls it only when the user has expressed clear, current intent to act — not for hypothetical questions.

## Input schema

```json
{
  "action": "approve | requestDeposit | requestRedeem | claimDeposit | claimRedeem",
  "amount": "string (human units; omitted for claimDeposit/claimRedeem)",
  "reasoning": "string, one sentence, shown to the user"
}
```

## Flow

1. User sends a message ("redeem 100 shares").
2. Claude, given current `vault.context`, decides whether to call this tool.
3. The API route returns `{ text, action }` — `action` is the parsed tool input, or `null` if no action was proposed.
4. The client renders `action` as a confirm/dismiss card (`src/components/AgentChat.tsx`).
5. On confirm, the client calls the SDK's matching `build*Tx` function (e.g. `buildRequestRedeemTx`) to get unsigned call data, then hands it straight to wagmi's `writeContract` (`src/app/page.tsx` → `handleAgentAction`) — the connected wallet (MetaMask, etc.) prompts for signature exactly as it would for any other transaction. This is the same `build*Tx` call the "Request deposit" / "Request redeem" manual forms use.

## Guardrails

- The tool is advisory-only by construction: this skill has no signer, no private key, and no path to broadcast a transaction on its own. Step 5 is the only place a transaction actually leaves the browser, and it always requires a wallet-native user confirmation.
- The API route does not trust the model's judgment on connection state as the sole gate — the UI additionally disables Confirm client-side when no wallet is connected (`canPropose` prop).
