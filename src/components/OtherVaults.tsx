"use client";

import { DataMetric } from "./DataMetric";
import { formatTvlUsd, IXS_VAULT_NAME, REGISTRY_MAX_AGE, TERMS_MAX_AGE } from "@/lib/data-status";
import { useVaultRegistry, PUBLIC_REGISTRY_URL } from "@/lib/use-vault-registry";
import { apyOf, type Vault } from "@/lib/registry";


function fmtMin(n: number) {
  return n === 0 ? "No minimum" : `$${n.toLocaleString("en-US")} min`;
}

function Card({ v, failed }: { v: Vault; failed: boolean }) {
  const apy = apyOf(v);
  const go = v.access.how_to_invest?.[0];
  return (
    <div className="panel p-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div>
        <div className="font-semibold">{v.id === "ixs-blackrock-hy-bond" ? IXS_VAULT_NAME : v.name}</div>
        <div className="text-[13px]" style={{ color: "#dde5ff" }}>{v.underlying}</div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] muted">
          <span className={`stamp ${v.terms.kyc === "none" ? "open" : "kyc"}`}>{v.terms.kyc === "none" ? "No KYC" : "Basic KYC"}</span>
          {v.access.agent_addressable && <span className="stamp agent">Agent addressable</span>}
          <span>{(v.chains ?? []).slice(0, 3).join(" · ")}</span>
        </div>
      </div>
      <div className="sm:text-right">
        <DataMetric label="Yield" value={apy.n} formatted={`${apy.n}%`} kind={apy.tag} source="VaultTerms" sourceUrl={PUBLIC_REGISTRY_URL} updatedAt={apy.tag === "target" ? v.verified_at : v.live?.as_of} maxAge={apy.tag === "target" ? TERMS_MAX_AGE : REGISTRY_MAX_AGE} failed={failed} />
        <DataMetric label="TVL" value={v.live?.tvl_usd} formatted={v.live?.tvl_usd == null ? undefined : formatTvlUsd(v.live.tvl_usd)} source="VaultTerms" sourceUrl={PUBLIC_REGISTRY_URL} updatedAt={v.live?.as_of} maxAge={REGISTRY_MAX_AGE} failed={failed} />
        <div className="text-xs muted">{v.access.min_usd == null ? "Minimum unavailable · VaultTerms" : fmtMin(v.access.min_usd)}</div>
        {go && (
          <a className="btn btn-accent mt-2 no-underline" href={go.url} target="_blank" rel="noopener noreferrer">
            {v.id === "ixs-blackrock-hy-bond" ? "Open on IXS" : /apply|onboard/i.test(go.method) ? "Apply" : "View vault"} ↗
          </a>
        )}
      </div>
    </div>
  );
}

export function OtherVaults() {
  const { data: vaults, isError: failed, refetch, isFetching } = useVaultRegistry();
  if (!vaults) return <div className="muted text-sm" role="status">
    {failed ? "VaultTerms is unavailable. Try loading the ledger again." : "Loading the VaultTerms ledger…"}
    {failed && <button className="btn ml-2" onClick={() => refetch()} disabled={isFetching}>Retry ledger</button>}
  </div>;

  const live = vaults.filter((v) => v.id !== "goldfinch-prime" && v.status !== "new" && v.status !== "wound_down");
  const bySpread = (a: Vault, b: Vault) => (apyOf(b).n ?? 0) - (apyOf(a).n ?? 0);
  const cheap = live.filter((v) => v.terms.kyc === "kyc_retail" && v.access.min_usd != null && v.access.min_usd <= 500 && v.access.retail_accessible).sort(bySpread);
  const noKyc = live.filter((v) => v.terms.kyc === "none").sort(bySpread);

  return (
    <div className="space-y-8">
      <p className="text-sm muted">{vaults.length} verified entries in the VaultTerms registry; the lists below show retail subsets. Tracked entries on VaultTerms have market data only, without verified access terms. Total means verified plus tracked.
      {failed && <> Refresh failed; retained figures are stale. <button className="btn" onClick={() => refetch()} disabled={isFetching}>Retry ledger</button></>}</p>
      <div>
        <div className="flex items-baseline gap-3 mb-1">
          <h2 className="h2">Under $500 — basic KYC</h2>
          <span className="text-xs" style={{ color: "var(--accent2)" }}>{cheap.length} vaults</span>
        </div>
        <p className="muted text-[13px] mb-3 max-w-[56em]">
          Standard retail onboarding — exchange-level KYC, minimums from $1. The regulated wrappers live here: SEC-registered money market funds, MAS-licensed vaults, gold trusts.
        </p>
        <div className="space-y-2.5">{cheap.map((v) => <Card key={v.id} v={v} failed={failed} />)}</div>
      </div>
      <div>
        <div className="flex items-baseline gap-3 mb-1">
          <h2 className="h2">No KYC — just a wallet</h2>
          <span className="text-xs" style={{ color: "var(--accent2)" }}>{noKyc.length} vaults</span>
        </div>
        <p className="muted text-[13px] mb-3 max-w-[56em]">
          No forms, no documents — but know what you&apos;re holding: this club is crypto-native yield (collateralized lending books, carry trades, unregistered wrappers). None of these are regulated fund shares.
        </p>
        <div className="space-y-2.5">{noKyc.map((v) => <Card key={v.id} v={v} failed={failed} />)}</div>
      </div>
    </div>
  );
}
