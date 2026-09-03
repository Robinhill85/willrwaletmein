"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useCallback, useState } from "react";
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
import { HowItWorks } from "@/components/HowItWorks";

const VAULT_CONFIG = KNOWN_VAULTS["avax-ixhyb"];
const VAULT_ADDRESS = VAULT_CONFIG.address;

function fmtUsd(n: number) {
  return n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${Math.round(n).toLocaleString("en-US")}`;
}

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
  const [promoBadge, setPromoBadge] = useState<string | null>(null);
  const onPromo = useCallback((b: string | null) => setPromoBadge(b), []);

  const vault = { address: VAULT_ADDRESS, abi: vaultAbi } as const;

  const { data: name } = useReadContract({ ...vault, functionName: "name" });
  const { data: symbol } = useReadContract({ ...vault, functionName: "symbol" });
  const { data: decimals } = useReadContract({ ...vault, functionName: "decimals" });
  const { data: totalAssets } = useReadContract({ ...vault, functionName: "totalAssets" });
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
  const tvl = totalAssets !== undefined ? Number(formatUnits(totalAssets as bigint, dec)) : null;

  const vaultContext = {
    vaultAddress: VAULT_ADDRESS,
    chain: "Avalanche C-Chain",
    standard: "ERC-7540 async vault",
    vaultName: typeof name === "string" ? name : null,
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
            So — will RWA let <em>you</em> in? Ask the agent. It reads the verified terms of ~26 vaults and live CoinMarketCap RWA data, and it can deposit into the IXS vault for you.
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
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <div className="font-bold text-lg">{typeof name === "string" ? name : "IXS High Yield Corporate Bond Vault"} <span className="muted font-normal text-sm">· Avalanche · ERC-7540</span></div>
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
            <div className="fig">7% <small>target · ~5% trailing</small></div>
            <div className="text-xs muted mt-0.5">TVL {tvl != null ? fmtUsd(tvl) : "…"} <span style={{ color: "var(--accent2)" }}>live onchain</span> · $100 min</div>
            <div className="text-[11px] muted break-all mt-1">{VAULT_ADDRESS}</div>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-2.5 mt-4">
          <div className="panel-deep p-3 text-[12.5px]" style={{ color: "#dde5ff" }}>
            <div className="k mb-1" style={{ color: "var(--accent2)" }}>For your AI agent</div>
            Use any agent and any wallet — deposit through the ERC-7540 rail with one API call. The agent on this page is one such agent: it drafts, you sign.
          </div>
          <div className="panel-deep p-3 text-[12.5px]" style={{ color: "#dde5ff" }}>
            <div className="k mb-1" style={{ color: "var(--accent2)" }}>For you, manually</div>
            One-time basic KYC, deposit from $100, withdraw anytime with next-day settlement — at{" "}
            <a href="https://vaults.ixs.finance/vaults" target="_blank" rel="noopener noreferrer">vaults.ixs.finance</a>.
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
          Every vault below has hand-verified terms. Full minimums, jurisdictions, redemption and fees for all ~100 vaults at{" "}
          <a href="https://vaultterms.com">vaultterms.com</a>.
        </p>
        <OtherVaults onPromo={onPromo} />
      </section>

      <footer className="text-[12.5px] muted space-y-2 pt-4 border-t" style={{ borderColor: "var(--line)" }}>
        <p className="max-w-[64em]">
          <strong className="text-white">This is information, not advice.</strong> Yields are targets or trailing figures — they vary and can be negative. Terms verified against issuer documents; issuers change terms without telling us. The agent drafts transactions; you sign them; verify the vault contract yourself before depositing real funds.
        </p>
        <p>
          Every vault here — including our client IXS&apos;s — is held to the same verified-terms standard. · Data: VaultTerms registry + CoinMarketCap Real-World Assets API · vault execution via @ixswap1/vault-agent-sdk · #BuildwithCMC
        </p>
      </footer>
    </main>
  );
}
