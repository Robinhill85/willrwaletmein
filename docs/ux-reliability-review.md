# UX and data reliability fixes

The IXS headline previously used a hardcoded yield and an unconditional “live onchain” label. The contract's small positive TVL could also round to `$0`. Metrics now distinguish real zero, unavailable data and stale readings, and include their source and update date. The existing blue grid, panels, amber figures, hero, marketing voice and wallet execution flow remain.

## PR checklist

- [x] Shared LIVE / ZERO / UNAVAILABLE / STALE presentation for IXS and list yield/TVL. Loading has a separate label. Fractional positive TVL displays `<$0.01`, never a false zero.
- [x] IXS target yield comes from VaultTerms, with its verification date and explicit estimated-target label. A current target is not a realized return. No fabricated timestamp precision for date-only sources.
- [x] Chain TVL waits for actual asset decimals instead of temporarily applying the fallback 18 decimals. Chain refresh runs every 30 seconds; registry refresh every five minutes. Failed refreshes retain data marked stale.
- [x] Chat spinner and accessible progress, 55-second browser timeout, bounded server/model/upstream requests, recoverable failures and retry. Send is disabled only in flight; drafting remains available. Retry preserves the question history and draft input, while using current wallet context.
- [x] Desktop transcript expansion; mobile transcript follows page scrolling with a sticky composer. IME composition does not accidentally send a message.
- [x] Canonical display name: **IXS High Yield Corporate Bond Vault**. Contract metadata remains separate in agent context and does not override the product heading. No alternate official marketing short name is assumed.
- [x] Verified count comes from the loaded registry (26 at verification). Tracked means market data without hand-verified access terms; total means verified plus tracked. Removed the claim that all ~100 have full verified terms. These definitions match the live VaultTerms page.
- [x] Destination-specific View vault / Apply / Open on IXS links, real GitHub source/support links, footer Privacy and Terms content, and a keyboard-accessible glossary covering all five requested terms.
- [x] Muted text and secondary text use lighter existing blue-white tints. On dark panels they retain softer tints. The bare-background tint is approximately 4.53:1 even against the brightest modeled grid intersection; base blue contrast is higher. Focus indicators and reduced-motion spinner support added.

## Freshness policy

These are application freshness thresholds, not issuer guarantees:

- Onchain reads: five minutes; update time is the successful RPC read time, not a block timestamp. USD TVL retains the existing USDC denomination assumption.
- VaultTerms joined market figures: 48 hours, allowing for its daily refresh.
- Verified target-yield terms: 30 days; display the original verification date.
- Missing/invalid numbers: UNAVAILABLE. Old/missing/invalid timestamps or a failed refresh with retained data: STALE. Current actual zero: ZERO. Current nonzero: LIVE. Small clock lag of up to 60 seconds is tolerated so a new query result doesn't momentarily look stale between timer ticks.
- CMC supplies market data to chat, not these cards. Chat is instructed to cite endpoint timestamps; CMC failures explicitly expose a retry affordance.

## Verification

Verified locally at `http://localhost:3012` on 5 September 2026 (London):

- Desktop 1280px and mobile 375×812: hero, IXS and other vault cards, chat, and wallet picker. Picker opened and closed on both sizes; no wallet connected or transaction signed.
- Real IXS “what backs it / what's the catch?” question returned a VaultTerms-backed reply. Real gold-issuer question returned a CMC-backed reply.
- Browser failure injection: 502 then successful retry; unchanged question history; draft retention; editable composer while waiting; CMC partial-data response; 55-second timeout; registry outage and recovery; ZERO/STALE/UNAVAILABLE fixture cards; desktop expansion; no horizontal overflow at 375px; no uncaught page errors.
- Four regression tests: missing vs zero, aging and failed-refresh states, unknown/future timestamps, and fractional TVL formatting.
- ESLint, TypeScript and production build pass.

Commands:

```sh
npm run lint
npx tsc --noEmit
node --experimental-strip-types --test tests/*.test.mjs
npm run build
```

Browser failure checks used an isolated Playwright session with temporary fixtures; production data was not changed. No deployment or git push was performed. Wallet signing and settlement were deliberately outside verification scope.

## Files touched

| File | Change |
| --- | --- |
| `src/lib/data-status.ts` | Canonical name, freshness classification, honest TVL formatting |
| `src/components/DataMetric.tsx` | Shared status/source/date display |
| `src/lib/use-vault-registry.ts` | Shared registry query, timeout, refresh and retry |
| `src/app/page.tsx` | IXS metrics, canonical heading, glossary and trust footer |
| `src/components/OtherVaults.tsx` | List metrics, taxonomy, CTAs and ledger recovery |
| `src/components/AgentChat.tsx` | Loading, timeout/retry, composer and transcript behavior |
| `src/app/api/agent/route.ts` | Bounded model requests, recoverable tool failures, data-honesty guidance |
| `src/lib/registry.ts` | Upstream timeout and source/status metadata for chat |
| `src/lib/cmc.ts` | CMC request timeout |
| `src/lib/tools.ts` | Recoverable CMC failures and canonical IXS tool results |
| `src/components/HowItWorks.tsx` | Real source link and consistent registry language |
| `src/app/globals.css` | Contrast, focus, spinner and mobile chat rules using existing tokens |
| `tests/data-status.test.mjs` | Four regression tests |
| `.gitignore` | Ignore local `.gstack/` browser tooling artifacts |
| `docs/ux-reliability-review.md` | This review and verification record |
