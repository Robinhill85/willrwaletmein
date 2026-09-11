# Build with CMC: final checks and submission plan

Updated 11 September 2026. Both sites are deployed with the final proofreading changes, and the repositories contain the current submission copy. Video, DoraHacks and X links still need to be supplied in this checklist.

## Recommendation

Submit two distinct entries. Lead with Will RWA let me in? in **AI Agents and Automation**: the user asks a question, the agent calls CMC and the terms registry, then explains an actionable shortlist. Submit VaultTerms in **Real World Assets**: a research interface connecting CMC's issuer and wrapper data with verified access terms. Disclose the shared registry and link the sister project. Each entry should stand on its own, with its own demo, evidence and description.

The [official CMC rules](https://coinmarketcap.com/api/resources/api-hackathon/) permit multiple submissions, with one prize per person/team. They list opening at 9 September 2026 00:00 UTC and closing at 30 September 2026 23:59 UTC. In London the deadline is **1 October at 00:59 BST**. Aim to submit as soon as the videos and required links are ready, leaving time for corrections before the deadline. Judging runs 1–16 October; results are listed for 19 October.

## Readiness

| Requirement | Will RWA let me in? | VaultTerms |
|---|---|---|
| Public repository | [Verified public](https://github.com/Robinhill85/willrwaletmein) | [Verified public](https://github.com/Robinhill85/vaultterms) |
| Working deployed demo | [Live site checked](https://willrwaletmein.com) | [Live site checked](https://vaultterms.com) |
| One track | AI Agents and Automation | Real World Assets |
| Explicit endpoints | Five, listed in README and evidence | Three, listed in README and evidence |
| Code + real response | Five real calls captured September 11; code and JSON public | Three real calls captured September 8; code and JSON public |
| API benefit / friction note | Draft ready | Draft ready |
| Demo video | Record and host using the final scripts | Record and host using the final scripts |
| DoraHacks URL | Create the BUIDL/submission | Create the BUIDL/submission |
| X post | Draft ready; needs DoraHacks and video URLs | Draft ready; needs DoraHacks and video URLs |

The supplied requirements accept a deployed demo for the running-product requirement, but the X-post requirement still names a **demo video**. Make a short video for each.

## Release sequence

1. **Website release completed on 11 September.** VaultTerms was released first, followed by Will RWA. Both public sites show the final copy. Use the latest `main` in each repository; the current release notes and README describe the final version.
2. **Check the deployed changes.** Both IXS entries must distinguish protocol TVL from the separate Avalanche and BNB vault balances, link BNB availability and state “Deposit $100 USDC or more.” Run one eligibility question, one CMC question, and the disconnected-wallet deposit prompt. Confirm no action is submitted. The full signing → settlement → claim lifecycle is outside these checks; demonstrate a proposal as a proposal, and only use an actual receipt if separately verified.
3. **Refresh evidence on recording day.** Run each repository's capture script, commit the JSON, and open it from the public repo. Keep the endpoint, parameters, response timestamp and success status readable. Never record API keys, environment files, account dashboards or wallet recovery material.
4. **Record separate 90–120 second demos.** Use the scripts in each submission draft. CMC should appear in the first 30 seconds. For the agent, the IXS deposit proposal is a secondary capability; the CMC-powered answer is the core hackathon demonstration. For VaultTerms, show issuer → wrapper → verified terms.
5. **Register and prepare two DoraHacks entries.** Use the CMC account email for the event API grant, confirm it is active, select one track per entry, and paste the matching draft. Add public repository, deployed URL, video URL and evidence link. Describe shared components and pre-existing work accurately. The CMC integrations began on 3 September; retain those real dates and explain what was added for this event.
6. **Publish each DoraHacks entry and copy its actual URL.** Verify the page is publicly readable and attached to the correct hackathon. Only then fill the X drafts with the real DoraHacks and video URLs and publish each with `#BuildwithCMC`. Link the post back in DoraHacks if the form offers that field. Do not leave placeholders.
7. **Final public check.** Open both repos, demos, videos, submissions and X posts logged out. Save their final URLs and the commit SHAs below. Recheck submission status before the deadline; do not mistake a saved draft for a submitted entry.

## Keep the demos working through judging

Event API access ends at submission close under the published rules. Confirm the existing CMC plan can keep the RWA endpoints available through 19 October, and keep the agent's Anthropic balance available. A video and committed response preserve evidence if a live service fails, but the application should continue to work. VaultTerms snapshots have freshness labels; they must not be relabeled as fresh if a refresh fails. Check the GitHub Actions refresh after release and before recording. The most recent three runs were successful during the September 8 review; inspect the latest run again before recording.

## Positioning and remaining checks

- Do not market the CMC blended tokenized price as a live NASDAQ reference. The tested agent correctly acknowledged the missing primary-exchange price. Demonstrate wrapper-to-wrapper comparison and issuer discovery instead.
- Do not attribute vault TVL or eligibility to CMC. Show exactly which data CMC supplied and which came from the registry/onchain reads.
- Protocol-level TVL and project reference-pool APY now have explicit scope labels on both sites and in agent answers. These are contextual figures, not verified balances or yields for an individual product; demonstrate the distinction if you show the Ondo entries.
- BNB availability does not imply the Avalanche rewards apply there. The prepared copy states this.
- Preserve attribution to IXS's MIT-licensed sample app. VaultTerms is a public repository; choose a license separately if you want to call it open source.

## Final copy conventions

- Describe the agent as a research and transaction-drafting interface. The user signs each transaction in their wallet.
- Use neutral site descriptions and accurate software/source attribution.
- Say “Deposit $100 USDC or more.” TVL display rounding does not restrict deposit amounts.
- Name protocol TVL and per-chain vault balances separately. Keep source dates visible.
- Frame the NVDA example as an issuer-price comparison against CMC’s blended tokenized average.
- Treat dated reports and captured responses as historical evidence, not current quotes or release instructions.

## Materials

- [Will RWA submission and demo script](https://github.com/Robinhill85/willrwaletmein/blob/main/docs/submission-draft.md)
- [VaultTerms submission and demo script](https://github.com/Robinhill85/vaultterms/blob/main/docs/submission-draft.md)
- [Will RWA current release](https://github.com/Robinhill85/willrwaletmein/blob/main/docs/release-2026-09-11.md)
- [VaultTerms current release](https://github.com/Robinhill85/vaultterms/blob/main/docs/release-2026-09-11.md)

## Final URLs to fill after publication

| Entry | DoraHacks | Video | X post | Release commit |
|---|---|---|---|---|
| Will RWA let me in? | Pending | Pending | Pending | `5f3d7d9` proofreading release; use latest `main` for final copy |
| VaultTerms | Pending | Pending | Pending | `84f6f02` proofreading release; use latest `main` for final copy |
