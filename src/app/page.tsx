"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatUnits, parseUnits, type Address } from "viem";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
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
import { AboutAgent } from "@/components/AboutAgent";

const VAULT_CONFIG = KNOWN_VAULTS["avax-ixhyb"];
const VAULT_ADDRESS = VAULT_CONFIG.address;

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 dark:border-white/10 p-4">
      <div className="text-xs uppercase tracking-wide opacity-60">{label}</div>
      <div className="text-lg font-medium mt-1 break-all">{value}</div>
    </div>
  );
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const [depositAmount, setDepositAmount] = useState("");
  const [redeemAmount, setRedeemAmount] = useState("");

  const vault = { address: VAULT_ADDRESS, abi: vaultAbi } as const;

  const { data: name } = useReadContract({ ...vault, functionName: "name" });
  const { data: symbol } = useReadContract({ ...vault, functionName: "symbol" });
  const { data: decimals } = useReadContract({ ...vault, functionName: "decimals" });
  const { data: totalAssets } = useReadContract({ ...vault, functionName: "totalAssets" });
  const { data: totalSupply } = useReadContract({ ...vault, functionName: "totalSupply" });
  const { data: assetAddress } = useReadContract({ ...vault, functionName: "asset" });

  const { data: shareBalance } = useReadContract({
    ...vault,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // @ixswap1/vault-agent-sdk resolves the correct ERC-7540 requestId from
  // the subgraph - it increments per request (1, 2, 3...), not always 0.
  const { data: requestIds } = useQuery({
    queryKey: ["vault-request-ids", VAULT_ADDRESS, address],
    queryFn: () => fetchLatestRequestIds(VAULT_CONFIG, address as Address),
    enabled: !!address,
    refetchInterval: 15_000,
  });

  const { data: pendingDeposit } = useReadContract({
    ...vault,
    functionName: "pendingDepositRequest",
    args: address && requestIds?.depositPendingId
      ? [BigInt(requestIds.depositPendingId), address]
      : undefined,
    query: { enabled: !!address && !!requestIds?.depositPendingId },
  });

  const { data: claimableDeposit } = useReadContract({
    ...vault,
    functionName: "claimableDepositRequest",
    args: address && requestIds?.depositFinalizedId
      ? [BigInt(requestIds.depositFinalizedId), address]
      : undefined,
    query: { enabled: !!address && !!requestIds?.depositFinalizedId },
  });

  const { data: pendingRedeem } = useReadContract({
    ...vault,
    functionName: "pendingRedeemRequest",
    args: address && requestIds?.redeemPendingId
      ? [BigInt(requestIds.redeemPendingId), address]
      : undefined,
    query: { enabled: !!address && !!requestIds?.redeemPendingId },
  });

  const { data: claimableRedeem } = useReadContract({
    ...vault,
    functionName: "claimableRedeemRequest",
    args: address && requestIds?.redeemFinalizedId
      ? [BigInt(requestIds.redeemFinalizedId), address]
      : undefined,
    query: { enabled: !!address && !!requestIds?.redeemFinalizedId },
  });

  const assetToken = { address: assetAddress as Address | undefined, abi: erc20Abi } as const;

  const { data: assetSymbol } = useReadContract({
    ...assetToken,
    functionName: "symbol",
    query: { enabled: !!assetAddress },
  });

  const { data: assetDecimals } = useReadContract({
    ...assetToken,
    functionName: "decimals",
    query: { enabled: !!assetAddress },
  });

  const { data: assetBalance } = useReadContract({
    ...assetToken,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!assetAddress && !!address },
  });

  const { data: allowance } = useReadContract({
    ...assetToken,
    functionName: "allowance",
    args: address ? [address, VAULT_ADDRESS] : undefined,
    query: { enabled: !!assetAddress && !!address },
  });

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const dec = typeof assetDecimals === "number" ? assetDecimals : 18;
  const shareDec = typeof decimals === "number" ? decimals : 18;

  const vaultContext = {
    vaultAddress: VAULT_ADDRESS,
    chain: "Avalanche C-Chain",
    standard: "ERC-7540 async vault",
    vaultName: typeof name === "string" ? name : null,
    vaultSymbol: typeof symbol === "string" ? symbol : null,
    assetAddress: assetAddress ?? null,
    assetSymbol: typeof assetSymbol === "string" ? assetSymbol : null,
    totalAssets: totalAssets !== undefined ? formatUnits(totalAssets as bigint, dec) : null,
    totalShares: totalSupply !== undefined ? formatUnits(totalSupply as bigint, shareDec) : null,
    connectedWallet: address ?? null,
    userAssetBalance: assetBalance !== undefined ? formatUnits(assetBalance as bigint, dec) : null,
    userShareBalance: shareBalance !== undefined ? formatUnits(shareBalance as bigint, shareDec) : null,
    userPendingDepositRequest:
      pendingDeposit !== undefined ? formatUnits(pendingDeposit as bigint, dec) : null,
    userClaimableDeposit:
      claimableDeposit !== undefined ? formatUnits(claimableDeposit as bigint, dec) : null,
    userPendingRedeemRequest:
      pendingRedeem !== undefined ? formatUnits(pendingRedeem as bigint, shareDec) : null,
    userClaimableRedeem:
      claimableRedeem !== undefined ? formatUnits(claimableRedeem as bigint, dec) : null,
  };

  const needsApproval =
    allowance !== undefined &&
    depositAmount &&
    parseUnits(depositAmount || "0", dec) > (allowance as bigint);

  // Every write below builds its unsigned tx via the SDK, then hands it to
  // wagmi's writeContract as-is - the SDK never signs anything itself.

  function handleApprove() {
    if (!assetAddress) return;
    writeContract(buildApproveTx(VAULT_CONFIG, assetAddress as Address, depositAmount || "0", dec));
  }

  function handleRequestDeposit() {
    if (!address) return;
    writeContract(buildRequestDepositTx(VAULT_CONFIG, address, depositAmount || "0", dec));
  }

  function handleRequestRedeem() {
    if (!address) return;
    writeContract(buildRequestRedeemTx(VAULT_CONFIG, address, redeemAmount || "0", shareDec));
  }

  function handleClaimDeposit() {
    if (!address || claimableDeposit === undefined) return;
    writeContract(buildClaimDepositTx(VAULT_CONFIG, address, claimableDeposit as bigint));
  }

  function handleAgentAction(proposed: ProposedAction) {
    if (!address) return;
    switch (proposed.action) {
      case "approve": {
        if (!assetAddress || !proposed.amount) return;
        writeContract(buildApproveTx(VAULT_CONFIG, assetAddress as Address, proposed.amount, dec));
        break;
      }
      case "requestDeposit": {
        if (!proposed.amount) return;
        writeContract(buildRequestDepositTx(VAULT_CONFIG, address, proposed.amount, dec));
        break;
      }
      case "requestRedeem": {
        if (!proposed.amount) return;
        writeContract(buildRequestRedeemTx(VAULT_CONFIG, address, proposed.amount, shareDec));
        break;
      }
      case "claimDeposit": {
        if (claimableDeposit === undefined) return;
        writeContract(buildClaimDepositTx(VAULT_CONFIG, address, claimableDeposit as bigint));
        break;
      }
      case "claimRedeem": {
        if (claimableRedeem === undefined) return;
        writeContract(buildClaimRedeemTx(VAULT_CONFIG, address, claimableRedeem as bigint));
        break;
      }
    }
  }

  return (
    <div className="max-w-6xl mx-auto w-full p-6 sm:p-10 space-y-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">
            {typeof name === "string" ? name : "IXS Vault"} {typeof symbol === "string" ? `(${symbol})` : ""}
          </h1>
          <p className="text-sm opacity-60 mt-1 break-all">
            {VAULT_ADDRESS} · Avalanche C-Chain · ERC-7540 async vault
          </p>
        </div>
        <ConnectButton />
      </header>

      <AboutAgent />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem] gap-8 items-start">
      <div className="space-y-8">
      <section className="grid grid-cols-2 gap-4">
        <StatCard
          label="Total assets"
          value={
            totalAssets !== undefined
              ? `${formatUnits(totalAssets as bigint, dec)} ${
                  typeof assetSymbol === "string" ? assetSymbol : ""
                }`
              : "—"
          }
        />
        <StatCard
          label="Total shares"
          value={totalSupply !== undefined ? formatUnits(totalSupply as bigint, shareDec) : "—"}
        />
      </section>

      {!isConnected ? (
        <p className="text-sm opacity-70">Connect a wallet to view your position and submit requests.</p>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4">
            <StatCard
              label={`Your ${typeof assetSymbol === "string" ? assetSymbol : "asset"} balance`}
              value={assetBalance !== undefined ? formatUnits(assetBalance as bigint, dec) : "—"}
            />
            <StatCard
              label="Your shares"
              value={shareBalance !== undefined ? formatUnits(shareBalance as bigint, shareDec) : "—"}
            />
            <StatCard
              label="Pending deposit request"
              value={pendingDeposit !== undefined ? formatUnits(pendingDeposit as bigint, dec) : "—"}
            />
            <StatCard
              label="Claimable deposit"
              value={claimableDeposit !== undefined ? formatUnits(claimableDeposit as bigint, dec) : "—"}
            />
            <StatCard
              label="Pending redeem request"
              value={pendingRedeem !== undefined ? formatUnits(pendingRedeem as bigint, shareDec) : "—"}
            />
          </section>

          <section className="space-y-3 rounded-lg border border-black/10 dark:border-white/10 p-4">
            <div className="flex items-center gap-2">
              <h2 className="font-medium">Request deposit</h2>
              <span className="text-[10px] uppercase tracking-wide rounded-full border border-black/10 dark:border-white/10 px-2 py-0.5 opacity-60">
                Direct helper
              </span>
            </div>
            <p className="text-xs opacity-60">
              ERC-7540 vaults are async: this submits a request. The vault operator fulfills it,
              then you claim shares. This form triggers the same on-chain call the agent proposes
              in chat — use whichever is faster for you.
            </p>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm"
                placeholder="Amount"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
              />
              {needsApproval ? (
                <button
                  className="rounded bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
                  onClick={handleApprove}
                  disabled={isPending || isConfirming}
                >
                  Approve
                </button>
              ) : (
                <button
                  className="rounded bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
                  onClick={handleRequestDeposit}
                  disabled={isPending || isConfirming || !depositAmount}
                >
                  Request deposit
                </button>
              )}
            </div>
            {claimableDeposit !== undefined && (claimableDeposit as bigint) > 0n && (
              <button
                className="text-sm underline"
                onClick={handleClaimDeposit}
                disabled={isPending || isConfirming}
              >
                Claim {formatUnits(claimableDeposit as bigint, dec)} {typeof assetSymbol === "string" ? assetSymbol : ""} deposit
              </button>
            )}
          </section>

          <section className="space-y-3 rounded-lg border border-black/10 dark:border-white/10 p-4">
            <div className="flex items-center gap-2">
              <h2 className="font-medium">Request redeem</h2>
              <span className="text-[10px] uppercase tracking-wide rounded-full border border-black/10 dark:border-white/10 px-2 py-0.5 opacity-60">
                Direct helper
              </span>
            </div>
            <p className="text-xs opacity-60">
              Same on-chain call the agent can propose in chat, triggered directly — no need to
              ask.
            </p>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm"
                placeholder="Shares"
                value={redeemAmount}
                onChange={(e) => setRedeemAmount(e.target.value)}
              />
              <button
                className="rounded border border-black/10 dark:border-white/10 px-4 py-2 text-sm font-medium disabled:opacity-50"
                onClick={handleRequestRedeem}
                disabled={isPending || isConfirming || !redeemAmount}
              >
                Request redeem
              </button>
            </div>
          </section>

          {txHash && (
            <p className="text-xs opacity-70 break-all">
              Tx: {txHash} {isConfirming ? "(confirming…)" : isConfirmed ? "(confirmed)" : ""}
            </p>
          )}
          {writeError && (
            <p className="text-xs text-red-500 break-all">{writeError.message}</p>
          )}
        </>
      )}
      </div>

      <AgentChat
        vaultContext={vaultContext}
        onConfirmAction={handleAgentAction}
        canPropose={isConnected}
      />
      </div>
    </div>
  );
}
