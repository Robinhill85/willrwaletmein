# Will RWA let me in?

Track: **AI Agents and Automation**

Tagline: An agent that connects live tokenized-asset data with the RWA vaults you can actually access.

Demo: https://willrwaletmein.com

Repository: https://github.com/Robinhill85/willrwaletmein

Video: **add the hosted demo URL before submitting**

## Submission description

Market data can tell you what a tokenized asset is worth. It does not tell you whether you can invest from your country, meet the minimum, pass the required onboarding, or get your money back when you need it.

Will RWA let me in? answers those questions in a conversation. It combines live CoinMarketCap RWA lookups with the VaultTerms registry of 26 entries with verified access terms. Ask about a tokenized stock or gold wrapper to see its prices and issuers. Give the agent your region, budget and KYC tolerance to get matching vaults, their underlying assets, minimums and trade-offs. Data-backed answers identify their sources.

It can also prepare unsigned deposit and redemption requests for the IXS vault on Avalanche. Deposits start at $100 USDC, and the user signs in their own wallet. The app shows IXS protocol TVL sourced from rwa.io via VaultTerms, with the daily Avalanche and BNB vault balances listed separately. BNB availability is linked; proposals in this app target Avalanche.

## CMC integration and evidence

The server calls these GET endpoints under `https://pro-api.coinmarketcap.com`:

- `/v5/real-world-assets/assets/list`
- `/v5/real-world-assets/quotes/latest`
- `/v5/real-world-assets/info`
- `/v5/real-world-assets/issuers/list`
- `/v5/real-world-assets/issuers`

[Client code](../src/lib/cmc.ts), [capture script](../scripts/capture-cmc-evidence.mjs), and [full real responses](evidence/cmc-live.json). The agent response also includes `cmc_calls` with endpoint, parameters, HTTP status and credits. The key stays server-side.

CMC made issuer discovery and live wrapper-price comparisons possible. Its RWA endpoints do not supply admission terms, APY or vault TVL, so those come from separately identified sources. The blended tokenized price is not a primary-exchange quote: the agent cannot promise a verified premium to NASDAQ when that reference is absent. Explicit descending sorting and handling string-valued success codes were practical integration fixes.

## Original work and shared components

The app began with IXS's MIT-licensed sample vault agent, attributed in the repository. The CMC client and tools, VaultTerms integration and conversational experience were added for this event, starting on 3 September 2026. VaultTerms is a separate RWA-track entry and supplies the shared terms registry. This entry demonstrates the conversational tool workflow and wallet-confirmed proposals.

## Demo script: about 110 seconds

| Time | Screen and narration |
|---|---|
| 0–10s | Homepage: “Market data tells me a price. This agent also tells me whether I can get in.” |
| 10–35s | Ask “Compare the tokenized NVDA wrappers and identify their issuers.” Show prices, timestamp and CMC source chip. State that the comparison uses CMC's tokenized average. |
| 35–55s | Show the exact CMC call in the Network response, then the public client code and real response JSON. Keep the API key out of view. |
| 55–80s | Ask “I'm in the EU with $1,000 and basic KYC. Which vaults can I access?” Show the shortlist and an access trade-off. |
| 80–95s | Show IXS protocol TVL, the separate per-chain vault balances and the $100 USDC minimum. Explain that proposals here target Avalanche. With no wallet, the deposit prompt should ask for a connection; only show a real proposal if it was actually generated. |
| 95–110s | Repo and demo URL. “CMC supplies the issuer and pricing layer; our registry supplies the access terms. The wallet stays in control.” |

## X draft

I built Will RWA let me in? An agent combining live CMC tokenized-asset data with vault access terms: who can invest, minimums and KYC.

Build: [DORAHACKS_URL]
Demo: [VIDEO_URL]
#BuildwithCMC

Replace both placeholders with the actual URLs after publishing the DoraHacks entry. This draft has not been posted.
