# Final checks — Will RWA let me in?

> Historical review. Figures, wording and deployment status below describe the review at that time. See the [11 September release](release-2026-09-11.md) and [current submission plan](submission-plan.md) for the final published version.

Checked 8 September 2026 against the then-local candidate on `fix/submission-checks-2026-09-08`. Production had not yet been updated at the time of that review. Public repo and deployed homepage were reachable. Framework: Next.js 16.3.4 / React 19.2.8.

## Findings and fixes

| Finding | Result and verification |
|---|---|
| IXS spotlight showed only the Avalanche balance / unavailable data | Uses the shared daily combined TVL, with chain breakdown and BNB availability. Desktop and 390px mobile previews show $4,753.14 at 22:14:23 UTC: Avalanche $401.05 + BNB $4,352.08. USDC is valued at $1. |
| “Top” CMC assets could be ranked ascending | Client now requests `sort_dir=desc`; regression verifies outgoing parameters and string success codes. |
| System prompt contradicted current rewards terms | Removed old hardcoded campaign dates and payout timing; answer now reads registry promotions. Live local answer gave 7–21 September and 21 December payout. |
| Search response could be cut off before IXS while still claiming 14 matches | Full bounded registry results and terms are returned as valid JSON. Regression preserves all 26 long fixtures beyond the previous 9KB cutoff. Local EU/$1,000/basic-KYC answer includes IXS. |
| Protocol TVL / reference-pool APY looked product-specific | Shared registry carries scope, cards label it, and the prompt preserves the distinction. Issuer targets take precedence. |
| Multi-word product searches could falsely report a missing entry | Keyword matching now finds issuer + ticker across separate fields in either order. A regression checks “Ondo OUSG” and reversed/case/spacing variants. |

## Verification

- `npm run lint` and `npm run build` passed, including TypeScript and production page generation.
- Eight Node regression tests passed with `node --experimental-transform-types --test tests/*.test.mjs`.
- Production CMC chat answered the NVDA question, displayed the CMC source and acknowledged the missing primary-exchange reference price.
- Local eligibility, combined TVL, rewards and disconnected-wallet prompts returned HTTP 200. A disconnected deposit request produced no actions. [Actual responses](evidence/agent-smoke.json).
- Five successful real CMC endpoint calls were captured through the application's client. [Code and full response evidence](cmc-evidence.md).
- Desktop and 390 × 844 mobile previews inspected; no document overflow at phone width. Combined TVL and chain values were visible. No browser console errors returned in the checked local flow. Screenshots were inspected inline in the task.
- Known configured credential values were checked against tracked/new files and git history; none matched. No credential files are tracked. This was a targeted credential check, not a comprehensive security audit.

## Release conditions and limits

Release VaultTerms first, then this application, and repeat the core smoke checks against production. The build used the default production registry; the local dev preview used explicit localhost overrides. Do not copy those overrides into production.

The signing → settlement → claim lifecycle was not executed in these checks. Describe unsigned proposals accurately in the video. Wallet balances and transaction state remain Avalanche-specific. BNB availability does not extend the Avalanche rewards terms to BNB.

Record and host the demo, create the DoraHacks entry, then publish the X draft with actual submission/video links and `#BuildwithCMC`. Keep CMC and Anthropic access working through judging. None of those publication steps was performed in this task.

This was a targeted functional/data release review, not an exhaustive accessibility or performance audit; no numerical health score is claimed.

[Submission copy and demo script](submission-draft.md)

## Fix commits

- `6941ec0`: descending CMC rankings.
- `adc9780`: complete registry transport and KYC ceiling guidance.
- `0680f8d`: issuer/ticker keyword search.
- `dab31f8`: current rewards terms.
- `b3487dc`: combined TVL display, data-scope labels and answer guidance.

The final scope recheck found OUSG and described both metric scopes correctly. Model wording remains variable: rehearse the exact demo and describe the site as an interface for researching vaults and drafting transactions.
