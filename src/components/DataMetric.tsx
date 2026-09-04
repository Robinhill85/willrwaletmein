"use client";

import { useEffect, useState } from "react";
import { dataStatus } from "@/lib/data-status";

export function DataMetric({ label, value, formatted, updatedAt, maxAge, source, sourceUrl, failed = false, loading = false, kind }: {
  label: string; value: number | null | undefined; formatted?: string;
  updatedAt?: string | number; maxAge: number; source: string; sourceUrl: string;
  failed?: boolean; loading?: boolean; kind?: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 15_000);
    return () => clearInterval(timer);
  }, []);
  const status = dataStatus(value, updatedAt, maxAge, now ?? 0, failed);
  const time = typeof updatedAt === "number" ? updatedAt : Date.parse(updatedAt ?? "");
  const dateOnly = typeof updatedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(updatedAt);
  const date = Number.isFinite(time) && time > 0 ? new Date(time).toISOString() : null;
  return (
    <div className="data-metric">
      <div className="fig">{label}: {value != null && Number.isFinite(value) ? formatted ?? value : "Unavailable"} {kind && <small>{kind}</small>}</div>
      <div className="text-xs muted">
        <span className="stamp">{loading && value == null ? "LOADING" : now === null ? "CHECKING" : status}</span>{" · "}
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer">{source}</a>
        {status === "ZERO" && " · reported zero"}
        {status === "STALE" && " · freshness unconfirmed"}
      </div>
      <div className="text-[11px] muted mt-1">
        {date ? <>Last updated <time dateTime={date}>{dateOnly ? updatedAt : date.replace("T", " ").replace(/\.\d{3}Z$/, " UTC")}</time></> : "Last updated: not supplied"}
      </div>
    </div>
  );
}
