# Skills

Skill manifests for this agent, following the [IXS Skills API](https://api-v2.ixs.finance/docs#/skills) convention.

Each skill maps to real code — the manifest documents intent and I/O shape; it is not a separate runtime loaded by the app. As of the [`@ixswap1/vault-agent-sdk`](https://www.npmjs.com/package/@ixswap1/vault-agent-sdk) migration, the read/subgraph/action logic lives in that published, LLM-agnostic package rather than duplicated in this app — this repo is the reference implementation consuming it.

| Skill | Manifest | Implementation |
| --- | --- | --- |
| `vault.read` | [`vault-read/SKILL.md`](vault-read/SKILL.md) | [`@ixswap1/vault-agent-sdk`](https://www.npmjs.com/package/@ixswap1/vault-agent-sdk) `readVaultState` / `readUserPosition` |
| `vault.context` | [`vault-context/SKILL.md`](vault-context/SKILL.md) | [`src/app/page.tsx`](../src/app/page.tsx) (`vaultContext`, app-level formatting on top of SDK reads) |
| `vault.proposeAction` | [`vault-propose-action/SKILL.md`](vault-propose-action/SKILL.md) | [`@ixswap1/vault-agent-sdk`](https://www.npmjs.com/package/@ixswap1/vault-agent-sdk) `PROPOSE_VAULT_ACTION_TOOL`, consumed in [`src/app/api/agent/route.ts`](../src/app/api/agent/route.ts) |
