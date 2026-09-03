const AGENT_WALLET_TOOLS = [
  { name: "viem (local account)", href: "https://viem.sh/docs/accounts/local" },
  { name: "Coinbase CDP SDK", href: "https://docs.cdp.coinbase.com" },
  { name: "Turnkey", href: "https://docs.turnkey.com" },
  { name: "Privy server wallets", href: "https://docs.privy.io/wallets/wallets/create/from-server" },
];

export function AboutAgent() {
  return (
    <section className="rounded-lg border border-black/10 dark:border-white/10 p-5 space-y-4 text-sm">
      <h2 className="font-medium">About this agent</h2>

      <ul className="space-y-3 list-disc pl-5 opacity-90">
        <li>
          Built using references from the IXS Skills API —{" "}
          <a
            href="https://api-v2.ixs.finance/docs#/skills"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            api-v2.ixs.finance/docs#/skills
          </a>
          .
        </li>
        <li>
          This agent does not hold any private keys. It reads on-chain vault state and drafts
          transactions for you — you still review and sign every transaction in your own wallet
          (MetaMask, etc.).
        </li>
        <li>
          Other agent architectures are possible: an agent can instead hold its own native
          wallet (EOA) and sign autonomously, using tools like{" "}
          {AGENT_WALLET_TOOLS.map((tool, i) => (
            <span key={tool.name}>
              <a
                href={tool.href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {tool.name}
              </a>
              {i < AGENT_WALLET_TOOLS.length - 1 ? ", " : ""}
            </span>
          ))}
          . This app deliberately does not do that — it stays non-custodial.
        </li>
        <li>This agent runs on Claude Sonnet 5 (Anthropic).</li>
      </ul>
    </section>
  );
}
