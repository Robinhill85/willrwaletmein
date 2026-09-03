"use client";

import { useEffect, useState } from "react";
import { activePromo, apyOf, type Vault } from "@/lib/registry";

const REGISTRY = "https://vaultterms.com/registry/vaults.enriched.json";

function fmtMin(n: number) {
  return n === 0 ? "No minimum" : `$${n.toLocaleString("en-US")} min`;
}

function Card({ v }: { v: Vault }) {
  const apy = apyOf(v);
  const go = v.access.how_to_invest?.[0];
  return (
    <div className="panel p-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div>
        <div className="font-semibold">{v.name}</div>
        <div className="text-[13px]" style={{ color: "#dde5ff" }}>{v.underlying}</div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] muted">
          <span className={`stamp ${v.terms.kyc === "none" ? "open" : "kyc"}`}>{v.terms.kyc === "none" ? "No KYC" : "Basic KYC"}</span>
          {v.access.agent_addressable && <span className="stamp agent">Agent addressable</span>}
          <span>{(v.chains ?? []).slice(0, 3).join(" · ")}</span>
        </div>
      </div>
      <div className="sm:text-right">
        <div className="fig">{apy.n != null ? `${apy.n}%` : "—"} <small>{apy.tag}</small></div>
        <div className="text-xs muted">{fmtMin(v.access.min_usd ?? 0)}</div>
        {go && (
          <a className="btn btn-accent mt-2 no-underline" href={go.url} target="_blank" rel="noopener noreferrer">
            Get in ↗
          </a>
        )}
      </div>
    </div>
  );
}

export function OtherVaults({ onPromo }: { onPromo?: (badge: string | null) => void }) {
  const [vaults, setVaults] = useState<Vault[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch(REGISTRY)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: Vault[]) => {
        setVaults(data);
        const ixs = data.find((v) => v.id === "ixs-blackrock-hy-bond");
        onPromo?.(ixs ? activePromo(ixs)?.badge ?? null : null);
      })
      .catch(() => setFailed(true));
  }, [onPromo]);

  if (failed) {
    return <p className="muted text-sm">The ledger didn't load — see <a href="https://vaultterms.com">vaultterms.com</a>.</p>;
  }
  if (!vaults) return <p className="muted text-sm">Loading the ledger…</p>;

  const live = vaults.filter((v) => v.id !== "goldfinch-prime" && v.status !== "new");
  const bySpread = (a: Vault, b: Vault) => (apyOf(b).n ?? 0) - (apyOf(a).n ?? 0);
  const cheap = live.filter((v) => v.terms.kyc === "kyc_retail" && (v.access.min_usd ?? 0) <= 500 && v.access.retail_accessible).sort(bySpread);
  const noKyc = live.filter((v) => v.terms.kyc === "none").sort(bySpread);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-baseline gap-3 mb-1">
          <h2 className="h2">Under $500 — basic KYC</h2>
          <span className="text-xs" style={{ color: "var(--accent2)" }}>{cheap.length} vaults</span>
        </div>
        <p className="muted text-[13px] mb-3 max-w-[56em]">
          Standard retail onboarding — exchange-level KYC, minimums from $1. The regulated wrappers live here: SEC-registered money market funds, MAS-licensed vaults, gold trusts.
        </p>
        <div className="space-y-2.5">{cheap.map((v) => <Card key={v.id} v={v} />)}</div>
      </div>
      <div>
        <div className="flex items-baseline gap-3 mb-1">
          <h2 className="h2">No KYC — just a wallet</h2>
          <span className="text-xs" style={{ color: "var(--accent2)" }}>{noKyc.length} vaults</span>
        </div>
        <p className="muted text-[13px] mb-3 max-w-[56em]">
          No forms, no documents — but know what you&apos;re holding: this club is crypto-native yield (collateralized lending books, carry trades, unregistered wrappers). None of these are regulated fund shares.
        </p>
        <div className="space-y-2.5">{noKyc.map((v) => <Card key={v.id} v={v} />)}</div>
      </div>
    </div>
  );
}
