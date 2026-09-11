# Security controls

Reviewed 11 September 2026. This is an application review, not a security certification or an audit of the IXS vault contracts.

## Public agent API

Production Vercel Firewall limits `/api/agent` and its path variants to 20 requests per IP per 10 minutes. The route also has a per-instance burst guard of 10 validated requests per minute, a 48 KiB body limit, bounded chat history and same-origin browser checks. Origin checks do not authenticate non-browser callers; the firewall is the distributed abuse control.

The model has bounded output, iterations and execution time. Client-supplied vault context is untrusted user data, never system instructions. These controls reduce abuse; an account-level Anthropic spend limit is still needed to cap costs from distributed callers. The firewall rule is deployment configuration, not recreated by cloning the repository.

## Wallet actions

Transactions require the connected account on Avalanche, loaded on-chain token decimals and sufficient loaded balances. Deposits also check allowance and the 100 USDC minimum. Amounts cannot use exponent notation, negative values or extra token precision. Approvals use the exact amount; proposals cannot supply arbitrary contracts, calldata or recipients. Every transaction still requires the user's wallet signature.

Proposals are tied to the wallet used when requesting them. The app pauses confirmations during a pending transaction and refreshes contract reads after confirmation. On-chain simulation and wallet confirmation remain essential because state can change after a read.

## Credentials and dependencies

CMC and Anthropic credentials remain server-side. Browser output is escaped, and response headers prevent framing and restrict object embedding. The wallet app's CSP deliberately does not enforce a script or connection allowlist yet.

Dependency overrides patch the Axios and ws advisories. At review time, npm reported no high or critical advisories and 22 moderate dependency entries arising from two underlying advisories:

- [uuid buffer bounds](https://github.com/uuidjs/uuid/security/advisories/GHSA-w5hq-g745-h8pq): older versions remain inside MetaMask dependencies. The affected APIs are v3/v5/v6 with caller-supplied buffers; the application itself does not call those APIs. This is not a proof that every vendor path is unreachable.
- [decode-uri-component malformed UTF-8 denial of service](https://github.com/SamVerschueren/decode-uri-component/security/advisories/GHSA-vcc3-ghjq-m6fr): retained by WalletConnect's older query-string dependency. A malicious URI can stall parsing in an affected connector path. Update the wallet dependency family together and test actual pairing; forcing an ESM-only decoder into the existing CommonJS dependency is incompatible.

GitHub secret scanning, push protection, vulnerability alerts and automated security updates are enabled. Review their PRs and complete a coordinated wallet connector upgrade.

## Validation

```sh
node --experimental-transform-types --test tests/*.test.mjs
npm run lint
npm run build
npm audit
```

The security tests cover request limits and origin checks, proposal validation, exact transaction arguments, wrong-chain and missing-data rejection, and escaped model output. Automated checks do not replace review of wallet prompts or an independent smart-contract audit.
