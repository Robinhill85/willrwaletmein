"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatUnits, parseUnits, type Address } from "viem";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  vaultAbi,
  erc20Abi,
  KNOWN_VAULTS,
  fetchLatestRequestIds,
  buildApproveTx,
  buildRequestDepositTx,
  buildRequestRedeemTx,
  buildClaimDepositTx,
  buildClaimRedeemTx,
} from "@ixswap1/vault-agent-sdk";
import { AgentChat, type ProposedAction } from "@/components/AgentChat";
import { OtherVaults } from "@/components/OtherVaults";
import { DataMetric } from "@/components/DataMetric";
import { formatTvlUsd, IXS_VAULT_NAME, ONCHAIN_MAX_AGE, TERMS_MAX_AGE } from "@/lib/data-status";
import { activePromo } from "@/lib/registry";
import { useVaultRegistry, PUBLIC_REGISTRY_URL } from "@/lib/use-vault-registry";
import { HowItWorks } from "@/components/HowItWorks";

const VAULT_CONFIG = KNOWN_VAULTS["avax-ixhyb"];
const VAULT_ADDRESS = VAULT_CONFIG.address;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-deep p-3">
      <div className="k">{label}</div>
      <div className="font-semibold mt-0.5 break-all text-[15px]">{value}</div>
    </div>
  );
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const [depositAmount, setDepositAmount] = useState("");
  const [redeemAmount, setRedeemAmount] = useState("");
  const registry = useVaultRegistry();
  const ixs = registry.data?.find(v => v.id === "ixs-blackrock-hy-bond");
  const promoBadge = ixs && !registry.isError ? activePromo(ixs)?.badge : null;

  const vault = { address: VAULT_ADDRESS, abi: vaultAbi } as const;

  const { data: name } = useReadContract({ ...vault, functionName: "name" });
  const { data: symbol } = useReadContract({ ...vault, functionName: "symbol" });
  const { data: decimals } = useReadContract({ ...vault, functionName: "decimals" });
  const assetsRead = useReadContract({ ...vault, functionName: "totalAssets", query: { refetchInterval: 30_000 } });
  const { data: totalAssets } = assetsRead;
  const { data: totalSupply } = useReadContract({ ...vault, functionName: "totalSupply" });
  const { data: assetAddress } = useReadContract({ ...vault, functionName: "asset" });

  const { data: shareBalance } = useReadContract({
    ...vault, functionName: "balanceOf", args: address ? [address] : undefined, query: { enabled: !!address },
  });

  // @ixswap1/vault-agent-sdk resolves the current ERC-7540 requestId from the
  // subgraph — it increments per request (1, 2, 3…), not always 0.
  const { data: requestIds } = useQuery({
    queryKey: ["vault-request-ids", VAULT_ADDRESS, address],
    queryFn: () => fetchLatestRequestIds(VAULT_CONFIG, address as Address),
    enabled: !!address,
    refetchInterval: 15_000,
  });

  const { data: pendingDeposit } = useReadContract({
    ...vault, functionName: "pendingDepositRequest",
    args: address && requestIds?.depositPendingId ? [BigInt(requestIds.depositPendingId), address] : undefined,
    query: { enabled: !!address && !!requestIds?.depositPendingId },
  });
  const { data: claimableDeposit } = useReadContract({
    ...vault, functionName: "claimableDepositRequest",
    args: address && requestIds?.depositFinalizedId ? [BigInt(requestIds.depositFinalizedId), address] : undefined,
    query: { enabled: !!address && !!requestIds?.depositFinalizedId },
  });
  const { data: pendingRedeem } = useReadContract({
    ...vault, functionName: "pendingRedeemRequest",
    args: address && requestIds?.redeemPendingId ? [BigInt(requestIds.redeemPendingId), address] : undefined,
    query: { enabled: !!address && !!requestIds?.redeemPendingId },
  });
  const { data: claimableRedeem } = useReadContract({
    ...vault, functionName: "claimableRedeemRequest",
    args: address && requestIds?.redeemFinalizedId ? [BigInt(requestIds.redeemFinalizedId), address] : undefined,
    query: { enabled: !!address && !!requestIds?.redeemFinalizedId },
  });

  const assetToken = { address: assetAddress as Address | undefined, abi: erc20Abi } as const;
  const { data: assetSymbol } = useReadContract({ ...assetToken, functionName: "symbol", query: { enabled: !!assetAddress } });
  const { data: assetDecimals } = useReadContract({ ...assetToken, functionName: "decimals", query: { enabled: !!assetAddress } });
  const { data: assetBalance } = useReadContract({
    ...assetToken, functionName: "balanceOf", args: address ? [address] : undefined, query: { enabled: !!assetAddress && !!address },
  });
  const { data: allowance } = useReadContract({
    ...assetToken, functionName: "allowance", args: address ? [address, VAULT_ADDRESS] : undefined, query: { enabled: !!assetAddress && !!address },
  });

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const dec = typeof assetDecimals === "number" ? assetDecimals : 18;
  const shareDec = typeof decimals === "number" ? decimals : 18;
  const sym = typeof assetSymbol === "string" ? assetSymbol : "USDC";
  const tvl = totalAssets !== undefined && typeof assetDecimals === "number" ? Number(formatUnits(totalAssets as bigint, dec)) : null;

  const vaultContext = {
    vaultAddress: VAULT_ADDRESS,
    chain: "Avalanche C-Chain",
    standard: "ERC-7540 async vault",
    vaultName: IXS_VAULT_NAME,
    onchainName: typeof name === "string" ? name : null,
    totalAssetsUpdatedAt: assetsRead.dataUpdatedAt || null,
    totalAssetsReadFailed: assetsRead.isError,
    vaultSymbol: typeof symbol === "string" ? symbol : null,
    assetAddress: assetAddress ?? null,
    assetSymbol: sym,
    totalAssets: tvl != null ? String(tvl) : null,
    totalShares: totalSupply !== undefined ? formatUnits(totalSupply as bigint, shareDec) : null,
    connectedWallet: address ?? null,
    userAssetBalance: assetBalance !== undefined ? formatUnits(assetBalance as bigint, dec) : null,
    userShareBalance: shareBalance !== undefined ? formatUnits(shareBalance as bigint, shareDec) : null,
    userAllowance: allowance !== undefined ? formatUnits(allowance as bigint, dec) : null,
    userPendingDepositRequest: pendingDeposit !== undefined ? formatUnits(pendingDeposit as bigint, dec) : null,
    userClaimableDeposit: claimableDeposit !== undefined ? formatUnits(claimableDeposit as bigint, dec) : null,
    userPendingRedeemRequest: pendingRedeem !== undefined ? formatUnits(pendingRedeem as bigint, shareDec) : null,
    userClaimableRedeem: claimableRedeem !== undefined ? formatUnits(claimableRedeem as bigint, dec) : null,
  };

  const needsApproval =
    allowance !== undefined && depositAmount && parseUnits(depositAmount || "0", dec) > (allowance as bigint);

  // Every write builds its unsigned tx via the SDK, then hands it to wagmi's
  // writeContract — the SDK never signs anything itself.
  function handleAgentAction(p: ProposedAction) {
    if (!address) return;
    switch (p.action) {
      case "approve":
        if (assetAddress && p.amount) writeContract(buildApproveTx(VAULT_CONFIG, assetAddress as Address, p.amount, dec));
        break;
      case "requestDeposit":
        if (p.amount) writeContract(buildRequestDepositTx(VAULT_CONFIG, address, p.amount, dec));
        break;
      case "requestRedeem":
        if (p.amount) writeContract(buildRequestRedeemTx(VAULT_CONFIG, address, p.amount, shareDec));
        break;
      case "claimDeposit":
        if (claimableDeposit !== undefined) writeContract(buildClaimDepositTx(VAULT_CONFIG, address, claimableDeposit as bigint));
        break;
      case "claimRedeem":
        if (claimableRedeem !== undefined) writeContract(buildClaimRedeemTx(VAULT_CONFIG, address, claimableRedeem as bigint));
        break;
    }
  }

  return (
    <main className="max-w-[1060px] mx-auto w-full px-5 py-8 sm:py-10 space-y-8">
      <header className="flex items-center justify-between gap-4">
        <div className="eyebrow">willrwaletmein.com</div>
        <ConnectButton showBalance={false} chainStatus="icon" />
      </header>

      {/* Hero */}
      <section className="flex flex-col md:flex-row gap-6 items-start">
        <div className="min-w-0">
          <h1 className="h1" style={{ maxWidth: "15em" }}>
            Yield that doesn&apos;t need <em>a bull market.</em>
          </h1>
          <p className="mt-4 text-[16.5px] max-w-[42em]" style={{ color: "#e6ecff" }}>
            <strong className="text-white">Most DeFi yield is recycled crypto</strong> — token emissions, trader leverage, points. It spikes when everyone&apos;s greedy and evaporates when they&apos;re not.{" "}
            <strong className="text-white">RWA yield is paid by the other economy:</strong> T-bill coupons, bond interest, insurance premiums, real loan repayments — cash flows that arrive whether crypto pumps or not, settled to your wallet onchain.
          </p>
          <p className="mt-3 muted text-sm">
            So — will RWA let <em>you</em> in? Ask the agent. It reads the verified VaultTerms ledger and live CoinMarketCap RWA data, and it can deposit into the IXS vault for you.
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero.jpg" alt="Engraved bank vault on a pedestal labeled Tokenized Real-World Assets" className="rounded-xl border w-full md:w-[300px] md:max-w-[34%] shadow-[0_8px_30px_rgba(0,0,0,.25)]" style={{ borderColor: "var(--line)" }} />
      </section>

      {/* Spotlight — live from chain */}
      <section className="spotlight p-5">
        <div className="flex items-baseline gap-3 mb-1">
          <span className="eyebrow">New — the first agent-first RWA vault</span>
        </div>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_18rem] md:items-center">
          <div>
            <div className="font-bold text-lg">{IXS_VAULT_NAME} <span className="muted font-normal text-sm">· Avalanche · ERC-7540</span></div>
            <div className="text-[13.5px] mt-1" style={{ color: "#dde5ff" }}>
              USDC vault deployed via OpenTrade into the iShares 0–5 Year High Yield Corporate Bond ETF (SHYG). Real bond coupons, daily accrual, next-day exits.
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <span className="stamp new">New</span>
              <span className="stamp agent">Agent addressable</span>
              <span className="stamp open">No KYC · agents</span>
              <span className="stamp kyc">Basic KYC · humans</span>
              {promoBadge && <span className="stamp bonus">{promoBadge}</span>}
            </div>
          </div>
          <div className="md:text-right">
            <DataMetric label="Yield" value={ixs?.yield_profile?.target_pct} formatted={`${ixs?.yield_profile?.target_pct}%`} kind="estimated target · not guaranteed" source="VaultTerms" sourceUrl={PUBLIC_REGISTRY_URL} updatedAt={ixs?.verified_at} maxAge={TERMS_MAX_AGE} failed={registry.isError} loading={registry.isPending} />
            <DataMetric label="TVL" value={tvl} formatted={tvl == null ? undefined : formatTvlUsd(tvl)} source="onchain · Avalanche" sourceUrl={`https://snowtrace.io/address/${VAULT_ADDRESS}`} updatedAt={assetsRead.dataUpdatedAt} maxAge={ONCHAIN_MAX_AGE} failed={assetsRead.isError} loading={assetsRead.isPending} />
            <div className="text-xs muted mt-1">$100 min</div>
            {(registry.isError || assetsRead.isError) && <button className="btn mt-2" onClick={() => { registry.refetch(); assetsRead.refetch(); }} disabled={registry.isFetching || assetsRead.isFetching}>Retry data</button>}
            <div className="text-[10px] font-mono muted break-all mt-1">{VAULT_ADDRESS}</div>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-2.5 mt-4">
          <div className="panel-deep p-3 text-[12.5px]" style={{ color: "#dde5ff" }}>
            <div className="k mb-1" style={{ color: "var(--accent2)" }}>For your AI agent</div>
            Use any agent and any wallet — deposit through the ERC-7540 rail with one API call. The agent on this page is one such agent: it drafts, you sign.
          </div>
          <div className="panel-deep p-3 text-[12.5px]" style={{ color: "#dde5ff" }}>
            <div className="k mb-1" style={{ color: "var(--accent2)" }}>For you, manually</div>
            One-time basic KYC, deposit from $100, withdraw anytime with next-day settlement.{" "}
            <a href="https://vaults.ixs.finance/vaults" target="_blank" rel="noopener noreferrer">Open on IXS ↗</a>
          </div>
        </div>
      </section>

      {/* Agent + position */}
      <section className="grid lg:grid-cols-[minmax(0,1fr)_20rem] gap-6 items-start">
        <AgentChat vaultContext={vaultContext} onConfirmAction={handleAgentAction} canPropose={isConnected} />

        <div className="space-y-3">
          <div className="panel p-4 space-y-3">
            <h2 className="h2" style={{ fontSize: 15 }}>Your position</h2>
            {!isConnected ? (
              <p className="text-sm muted">Connect a wallet to see your position and let the agent draft deposits.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Stat label={`${sym} balance`} value={assetBalance !== undefined ? formatUnits(assetBalance as bigint, dec) : "—"} />
                <Stat label="Vault shares" value={shareBalance !== undefined ? formatUnits(shareBalance as bigint, shareDec) : "—"} />
                <Stat label="Pending deposit" value={pendingDeposit !== undefined ? formatUnits(pendingDeposit as bigint, dec) : "—"} />
                <Stat label="Claimable deposit" value={claimableDeposit !== undefined ? formatUnits(claimableDeposit as bigint, dec) : "—"} />
              </div>
            )}
          </div>

          {isConnected && (
            <div className="panel p-4 space-y-3">
              <h2 className="h2" style={{ fontSize: 15 }}>Direct helpers</h2>
              <p className="text-xs muted">Same on-chain calls the agent proposes — no need to ask.</p>
              <div className="flex gap-2">
                <input className="input" placeholder={`Amount (${sym})`} value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
                {needsApproval ? (
                  <button className="btn btn-accent" onClick={() => assetAddress && writeContract(buildApproveTx(VAULT_CONFIG, assetAddress as Address, depositAmount || "0", dec))} disabled={isPending || isConfirming}>Approve</button>
                ) : (
                  <button className="btn btn-accent" onClick={() => address && writeContract(buildRequestDepositTx(VAULT_CONFIG, address, depositAmount || "0", dec))} disabled={isPending || isConfirming || !depositAmount}>Deposit</button>
                )}
              </div>
              <div className="flex gap-2">
                <input className="input" placeholder="Shares to redeem" value={redeemAmount} onChange={(e) => setRedeemAmount(e.target.value)} />
                <button className="btn" onClick={() => address && writeContract(buildRequestRedeemTx(VAULT_CONFIG, address, redeemAmount || "0", shareDec))} disabled={isPending || isConfirming || !redeemAmount}>Redeem</button>
              </div>
              {claimableDeposit !== undefined && (claimableDeposit as bigint) > 0n && (
                <button className="btn btn-accent w-full" onClick={() => address && writeContract(buildClaimDepositTx(VAULT_CONFIG, address, claimableDeposit as bigint))} disabled={isPending || isConfirming}>
                  Claim {formatUnits(claimableDeposit as bigint, dec)} {sym} deposit
                </button>
              )}
              {txHash && <p className="text-xs muted break-all">Tx: {txHash} {isConfirming ? "(confirming…)" : isConfirmed ? "(confirmed)" : ""}</p>}
              {writeError && <p className="text-xs down break-all">{writeError.message}</p>}
            </div>
          )}

          <HowItWorks />
        </div>
      </section>

      {/* The rest of the ledger */}
      <section>
        <div className="flex items-baseline gap-3 mb-1">
          <h2 className="h2">Who else will let you in</h2>
          <span className="text-xs" style={{ color: "var(--accent2)" }}>from the VaultTerms registry</span>
        </div>
        <p className="muted text-[13px] mb-5 max-w-[60em]">
          Every vault below has hand-verified terms. See the full verified ledger and the separate market-data-only tracked list at{" "}
          <a href="https://vaultterms.com">vaultterms.com</a>.
        </p>
        <OtherVaults />
      </section>

      <section className="panel p-4 text-sm" aria-label="Glossary">
        <details><summary className="font-semibold cursor-pointer">Quick glossary</summary>
          <p className="mt-3 muted">LIVE means the source is recent; ZERO means it reported zero. STALE means freshness is unconfirmed; UNAVAILABLE means no usable value. A current target yield is still an estimate.</p>
          <dl className="mt-3 space-y-2 muted">
            <div><dt className="text-white">RWA</dt><dd>Real-world assets: bonds, property, loans and other assets represented onchain.</dd></div>
            <div><dt className="text-white">ERC-7540</dt><dd>A vault standard for deposits and withdrawals that settle after a request, rather than instantly.</dd></div>
            <div><dt className="text-white">SHYG</dt><dd>The iShares 0–5 Year High Yield Corporate Bond ETF. It holds below-investment-grade corporate bonds.</dd></div>
            <div><dt className="text-white">TradFi</dt><dd>Traditional finance: banks, funds and securities markets.</dd></div>
            <div><dt className="text-white">Agent-addressable</dt><dd>Software can read a vault and draft transaction requests for a wallet to sign.</dd></div>
          </dl>
        </details>
      </section>
      <footer className="text-[12.5px] muted space-y-2 pt-4 border-t" style={{ borderColor: "var(--line)" }}>
        <p className="max-w-[64em]">
          <strong className="text-white">This is information, not advice.</strong> Yields are targets or trailing figures — they vary and can be negative. Terms verified against issuer documents; issuers change terms without telling us. The agent drafts transactions; you sign them; verify the vault contract yourself before depositing real funds.
        </p>
        <p>
          Every vault here — including our client IXS&apos;s — is held to the same verified-terms standard. · Data: VaultTerms registry + CoinMarketCap Real-World Assets API · vault execution via @ixswap1/vault-agent-sdk · #BuildwithCMC
        </p>
        <nav aria-label="Footer" className="flex flex-wrap gap-4">
          <a href="#privacy">Privacy</a><a href="#terms">Terms</a><a href="https://github.com/Robinhill85/willrwaletmein/issues" target="_blank" rel="noopener noreferrer">Support ↗</a>
        </nav>
        <section id="privacy"><h2 className="font-semibold text-white">Privacy</h2><p>Chat messages and the wallet context shown to the agent are sent to this site’s server and Anthropic to generate replies. Market lookups go to VaultTerms and CoinMarketCap; wallet reads use public blockchain RPC services. Don’t enter secrets or personal documents. This app keeps the transcript in page memory; service providers may retain request logs under their own policies.</p></section>
        <section id="terms"><h2 className="font-semibold text-white">Terms</h2><p>This site provides information and unsigned transaction drafts. Availability, eligibility and returns are not guaranteed. Your use of a vault is subject to its issuer’s terms; read those before signing. <a href="https://vaultterms.com">Read vault terms ↗</a></p></section>
      </footer>
    </main>
  );
}
