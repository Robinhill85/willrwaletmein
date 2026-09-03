---
name: vault.read
description: Read live on-chain state for the ix7540v1 ERC-7540 vault — TVL, share supply, and a connected wallet's balances and pending/claimable request amounts.
reference: https://api-v2.ixs.finance/docs#/skills
implementation: "@ixswap1/vault-agent-sdk" readVaultState / readUserPosition (https://www.npmjs.com/package/@ixswap1/vault-agent-sdk)
---

# vault.read

Reads the vault's public state via `viem` against Avalanche C-Chain — no wallet signature required. Implemented once in [`@ixswap1/vault-agent-sdk`](https://www.npmjs.com/package/@ixswap1/vault-agent-sdk) and consumed here rather than duplicated.

## Inputs

- `vaultAddress` — the vault's proxy address (`0xaD01573b459805E3954398796203d830B57A8bD9`)
- `account` (optional) — connected wallet address, for the user-scoped reads below

## Reads

| Call | Returns |
| --- | --- |
| `name`, `symbol`, `decimals` | Vault token metadata |
| `asset` | Underlying ERC-20 asset address |
| `totalAssets`, `totalSupply` | Vault TVL and share supply |
| `balanceOf(account)` | User's share balance |
| `pendingDepositRequest(requestId, account)` | User's unfulfilled deposit request, in asset units |
| `claimableDepositRequest(requestId, account)` | User's fulfilled deposit awaiting claim, in asset units |
| `pendingRedeemRequest(requestId, account)` | User's unfulfilled redeem request, in share units |

`requestId` is **not** always `0` — it increments per request (1, 2, 3…). The SDK resolves the correct current `requestId` from the subgraph before making these calls; see `vault.proposeAction`.

## Notes

The vault is ERC-7540 (async): a `requestDeposit` does not immediately mint shares. The operator must fulfill the request before it becomes claimable — see `vault.proposeAction`.
