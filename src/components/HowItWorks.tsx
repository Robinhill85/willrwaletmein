export function HowItWorks() {
  return (
    <section className="panel p-5 text-sm space-y-3">
      <h2 className="h2" style={{ fontSize: 16 }}>How this agent works</h2>
      <ul className="space-y-2 list-disc pl-5" style={{ color: "#dde5ff" }}>
        <li>
          <strong>Answers come from two sources, shown under every reply:</strong> the{" "}
          <a href="https://vaultterms.com" target="_blank" rel="noopener noreferrer">VaultTerms registry</a> (hand-verified terms, KYC tiers, minimums, jurisdictions for ~26 RWA vaults) and the{" "}
          <a href="https://coinmarketcap.com/api/documentation/pro-api-reference/real-world-assets" target="_blank" rel="noopener noreferrer">CoinMarketCap Real-World Assets API</a>{" "}
          (live tokenized prices, market caps, underlying tokens, TradFi venues, issuers).
        </li>
        <li>
          <strong>Non-custodial.</strong> The agent reads on-chain state and drafts ERC-7540 requests with{" "}
          <a href="https://www.npmjs.com/package/@ixswap1/vault-agent-sdk" target="_blank" rel="noopener noreferrer">@ixswap1/vault-agent-sdk</a>; every transaction is signed in your own wallet. No key ever touches this site.
        </li>
        <li>
          <strong>Agent-first by design.</strong> The IXS vault is permissionless for agents — this page&apos;s agent, or your own wired to your own signer. Humans who prefer the manual route use the permissioned vault with basic KYC at{" "}
          <a href="https://vaults.ixs.finance/vaults" target="_blank" rel="noopener noreferrer">vaults.ixs.finance</a>.
        </li>
        <li>
          <strong>Async vault.</strong> Deposits and redemptions are request → operator fulfilment → claim, not instant swaps. The agent tracks your pending and claimable amounts.
        </li>
        <li>Reasoning by Claude (Anthropic). Open source on GitHub.</li>
      </ul>
    </section>
  );
}
