export const IXS_VAULT_NAME = "IXS High Yield Corporate Bond Vault";
export const REGISTRY_MAX_AGE = 48 * 60 * 60_000;
export const TERMS_MAX_AGE = 30 * 24 * 60 * 60_000;
export const ONCHAIN_MAX_AGE = 5 * 60_000;

export function dataStatus(value: number | null | undefined, updatedAt: string | number | undefined, maxAge: number, now: number, failed = false) {
  if (value == null || !Number.isFinite(value)) return "UNAVAILABLE";
  const time = typeof updatedAt === "number" ? updatedAt : Date.parse(updatedAt ?? "");
  if (failed || !Number.isFinite(time) || time <= 0 || time > now + 60_000 || now - time > maxAge) return "STALE";
  return value === 0 ? "ZERO" : "LIVE";
}

export function formatTvlUsd(n: number) {
  if (!Number.isFinite(n)) return "Unavailable";
  if (n > 0 && n < 0.01) return "<$0.01";
  return n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}
