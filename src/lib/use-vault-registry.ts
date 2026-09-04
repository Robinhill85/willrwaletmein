"use client";

import { useQuery } from "@tanstack/react-query";
import type { Vault } from "./registry";

export const PUBLIC_REGISTRY_URL = "https://vaultterms.com/registry/vaults.enriched.json";

export function useVaultRegistry() {
  return useQuery<Vault[]>({
    queryKey: ["vaultterms-registry"],
    queryFn: async ({ signal }) => {
      const res = await fetch(PUBLIC_REGISTRY_URL, { signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]), cache: "no-store" });
      if (!res.ok) throw new Error("VaultTerms is unavailable");
      const data = await res.json();
      if (!Array.isArray(data) || !data.length || data.some(v => !v.id || !v.name || !v.terms || !v.access)) throw new Error("Invalid VaultTerms response");
      return data;
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    retry: 1,
  });
}
