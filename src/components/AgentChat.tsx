"use client";

import { useEffect, useRef, useState } from "react";
import type { ProposedVaultAction } from "@ixswap1/vault-agent-sdk";
import { Markdown } from "./Markdown";

export type ProposedAction = ProposedVaultAction;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: ProposedAction[];
  sent?: number[];
  sources?: string[];
}

const ACTION_LABEL: Record<ProposedAction["action"], string> = {
  approve: "Approve allowance",
  requestDeposit: "Request deposit",
  requestRedeem: "Request redeem",
  claimDeposit: "Claim deposit",
  claimRedeem: "Claim redeem",
};

const SUGGESTIONS = [
  "I'm in the EU with $1,000 and I'll do basic KYC — which vaults will let me in?",
  "What actually backs the IXS vault, and what's the catch?",
  "Is tokenized NVDA trading at a premium to the real stock right now?",
  "Which issuers tokenize gold, and how big is each?",
  "Deposit 100 USDC into the IXS vault",
];

export function AgentChat({
  vaultContext,
  onConfirmAction,
  canPropose,
}: {
  vaultContext: Record<string, unknown>;
  onConfirmAction: (action: ProposedAction) => void;
  canPropose: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "I'm your agent. Two things I can do:\n\n1. Answer anything about real-world-asset vaults: which ones will let you in, on what terms, and what actually backs them.\n2. Deposit directly into the IXS vault, the first agent-addressable RWA vault (from $100 USDC on Avalanche). Connect your wallet, then tell me the amount here in the chat and I'll draft it for you to sign.\n\nVault terms come from vaultterms.com, live market data from CoinMarketCap. I never hold keys.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  function toHistory(msgs: ChatMessage[]) {
    return msgs.map((m) => ({
      role: m.role,
      content:
        m.content ||
        (m.actions?.length
          ? m.actions.map((a) => `[Proposed ${ACTION_LABEL[a.action]}${a.amount ? ` of ${a.amount}` : ""}: ${a.reasoning}]`).join(" ")
          : ""),
    }));
  }

  async function send(preset?: string) {
    const text = (preset ?? input).trim();
    if (!text || isLoading) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: toHistory(next), vaultContext }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Agent request failed (${res.status})`);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.text ?? "", actions: data.actions?.length ? data.actions : data.action ? [data.action] : undefined, sources: data.sources ?? [] },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Something went wrong: ${err instanceof Error ? err.message : "request failed"}. Try again.` },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function confirm(index: number, k: number, action: ProposedAction) {
    onConfirmAction(action);
    setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, sent: [...(m.sent ?? []), k] } : m)));
  }
  function dismiss(index: number, k: number) {
    setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, actions: m.actions?.filter((_, j) => j !== k) } : m)));
  }

  return (
    <div className="panel flex flex-col" style={{ minHeight: "36rem" }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: "var(--line)" }}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="h2" style={{ fontSize: 16 }}>Your agent</h2>
          <span className="k">reads · answers · drafts — your wallet signs</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 text-sm" style={{ maxHeight: "34rem" }}>
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            {m.content && (
              <div className={`inline-block max-w-[88%] text-left ${m.role === "user" ? "bubble-user whitespace-pre-wrap" : "bubble-agent"}`}>
                {m.role === "user" ? m.content : <Markdown text={m.content} />}
              </div>
            )}
            {m.sources && m.sources.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {m.sources.map((s) => (
                  <span key={s} className="source">{s}</span>
                ))}
              </div>
            )}
            {m.actions?.map((a, k) => (
              <div key={k} className="mt-2 text-left inline-block w-full max-w-[88%] panel-deep p-3 space-y-2" style={{ borderColor: "var(--accent)" }}>
                <div className="k" style={{ color: "var(--accent)" }}>Proposed action {m.actions!.length > 1 ? `${k + 1} of ${m.actions!.length}` : ""} — you sign</div>
                <div className="font-semibold">
                  {ACTION_LABEL[a.action]}{a.amount ? ` — ${a.amount}` : ""}
                </div>
                <div className="text-xs muted">{a.reasoning}</div>
                {m.sent?.includes(k) ? (
                  <p className="text-xs muted">Sent to your wallet — watch the transaction status in the side panel.</p>
                ) : (
                  <div className="flex gap-2 pt-1">
                    <button className="btn btn-accent" onClick={() => confirm(i, k, a)} disabled={!canPropose}>
                      Confirm in wallet
                    </button>
                    <button className="btn" onClick={() => dismiss(i, k)}>Dismiss</button>
                  </div>
                )}
                {!canPropose && <p className="text-xs down">Connect a wallet to confirm this.</p>}
              </div>
            ))}
          </div>
        ))}
        {isLoading && <div className="text-xs muted">Checking the ledger and live data…</div>}
      </div>

      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button key={s} className="chip" onClick={() => send(s)} disabled={isLoading}>{s}</button>
          ))}
        </div>
      )}

      <div className="p-3 border-t flex gap-2" style={{ borderColor: "var(--line)" }}>
        <input
          className="input"
          placeholder="Ask about any vault, or tell me what to do…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          disabled={isLoading}
        />
        <button className="btn btn-accent" onClick={() => send()} disabled={isLoading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
