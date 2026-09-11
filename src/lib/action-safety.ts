import { isAddress, parseUnits, type Address } from "viem";
import { avalanche } from "viem/chains";
import { KNOWN_VAULTS, buildApproveTx, buildRequestDepositTx, buildRequestRedeemTx, buildClaimDepositTx, buildClaimRedeemTx, type ProposedVaultAction, type UnsignedVaultTx } from "@ixswap1/vault-agent-sdk";

export function validProposal(value: unknown): value is ProposedVaultAction {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  if (typeof p.action !== "string" || Object.keys(p).some(key => !["action", "amount", "reasoning"].includes(key))) return false;
  if (typeof p.reasoning !== "string" || p.reasoning.length > 2000) return false;
  if (["claimDeposit", "claimRedeem"].includes(String(p.action))) return p.amount == null;
  return ["approve", "requestDeposit", "requestRedeem"].includes(String(p.action)) &&
    typeof p.amount === "string" && /^(?:0|[1-9]\d{0,30})(?:\.\d{1,18})?$/.test(p.amount) && /[1-9]/.test(p.amount);
}

interface ActionContext {
  address?: Address;
  chainId?: number;
  busy: boolean;
  assetAddress: unknown;
  assetDecimals: unknown;
  shareDecimals: unknown;
  assetBalance: unknown;
  shareBalance: unknown;
  allowance: unknown;
  claimableDeposit: unknown;
  claimableRedeem: unknown;
}

export function buildSafeAction(proposal: unknown, ctx: ActionContext) {
  if (!ctx.address || !isAddress(ctx.address) || ctx.chainId !== avalanche.id || ctx.busy) throw new Error("Connect on Avalanche and wait for any pending transaction.");
  if (!validProposal(proposal)) throw new Error("Invalid proposal. Ask the agent to prepare it again.");
  const p = proposal;
  const vault = KNOWN_VAULTS["avax-ixhyb"];
  const amount = safeAmount(p.amount, p.action === "requestRedeem" ? ctx.shareDecimals : ctx.assetDecimals);
  let tx: UnsignedVaultTx;
  switch (p.action) {
    case "approve":
      if (typeof ctx.assetAddress !== "string" || !isAddress(ctx.assetAddress) || amount === null || !p.amount || typeof ctx.assetBalance !== "bigint" || amount > ctx.assetBalance) throw new Error("Enter a valid amount within your loaded token balance. Token decimals must finish loading.");
      tx = buildApproveTx(vault, ctx.assetAddress, p.amount, ctx.assetDecimals as number);
      break;
    case "requestDeposit":
      if (amount === null || !p.amount || amount < 100n * 10n ** BigInt(ctx.assetDecimals as number) || typeof ctx.assetBalance !== "bigint" || amount > ctx.assetBalance) throw new Error("Deposits must be at least 100 USDC and within your loaded balance.");
      if (typeof ctx.allowance !== "bigint" || amount > ctx.allowance) throw new Error("Approve this deposit amount first, then wait for the allowance to refresh.");
      tx = buildRequestDepositTx(vault, ctx.address, p.amount, ctx.assetDecimals as number);
      break;
    case "requestRedeem":
      if (amount === null || !p.amount || typeof ctx.shareBalance !== "bigint" || amount > ctx.shareBalance) throw new Error("Enter a valid share amount within your loaded balance.");
      tx = buildRequestRedeemTx(vault, ctx.address, p.amount, ctx.shareDecimals as number);
      break;
    case "claimDeposit":
      if (typeof ctx.claimableDeposit !== "bigint" || ctx.claimableDeposit <= 0n) throw new Error("No claimable deposit is loaded.");
      tx = buildClaimDepositTx(vault, ctx.address, ctx.claimableDeposit);
      break;
    case "claimRedeem":
      if (typeof ctx.claimableRedeem !== "bigint" || ctx.claimableRedeem <= 0n) throw new Error("No claimable redemption is loaded.");
      tx = buildClaimRedeemTx(vault, ctx.address, ctx.claimableRedeem);
      break;
  }
  return { ...tx, chainId: avalanche.id, account: ctx.address };
}

export function safeAmount(value: unknown, decimals: unknown): bigint | null {
  if (typeof value !== "string" || !/^(?:0|[1-9]\d{0,30})(?:\.\d{1,18})?$/.test(value) ||
    typeof decimals !== "number" || !Number.isInteger(decimals) || decimals < 0 || decimals > 36 ||
    (value.split(".")[1]?.length ?? 0) > decimals) return null;
  try {
    const amount = parseUnits(value, decimals);
    return amount > 0n && amount < 2n ** 256n ? amount : null;
  } catch { return null; }
}
