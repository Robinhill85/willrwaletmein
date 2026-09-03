"use client";

import { useEffect, useRef, useState } from "react";
import type { ProposedVaultAction } from "@ixswap1/vault-agent-sdk";

export type ProposedAction = ProposedVaultAction;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  action?: ProposedAction;
  actionStatus?: "pending" | "sent";
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
        "I'm your agent. Ask me which real-world-asset vaults will actually let you in, what backs them, or what a tokenized asset is worth right now — or tell me what to do in the IXS vault (\"deposit 100 USDC\") and I'll draft it for your wallet to sign. I never hold keys.",
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
        (m.action
          ? `[Proposed ${ACTION_LABEL[m.action.action]}${m.action.amount ? ` of ${m.action.amount}` : ""}: ${m.action.reasoning}]`
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
        { role: "assistant", content: data.text ?? "", action: data.action ?? undefined, sources: data.sources ?? [] },
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

  function confirm(index: number, action: ProposedAction) {
    onConfirmAction(action);
    setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, actionStatus: "sent" } : m)));
  }
  function dismiss(index: number) {
    setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, action: undefined } : m)));
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
              <div className={`inline-block max-w-[88%] whitespace-pre-wrap text-left ${m.role === "user" ? "bubble-user" : "bubble-agent"}`}>
                {m.content}
              </div>
            )}
            {m.sources && m.sources.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {m.sources.map((s) => (
                  <span key={s} className="source">{s}</span>
                ))}
              </div>
            )}
            {m.action && (
              <div className="mt-2 text-left inline-block w-full max-w-[88%] panel-deep p-3 space-y-2" style={{ borderColor: "var(--accent)" }}>
                <div className="k" style={{ color: "var(--accent)" }}>Proposed action — you sign</div>
                <div className="font-semibold">
                  {ACTION_LABEL[m.action.action]}{m.action.amount ? ` — ${m.action.amount}` : ""}
                </div>
                <div className="text-xs muted">{m.action.reasoning}</div>
                {m.actionStatus === "sent" ? (
                  <p className="text-xs muted">Sent to your wallet — watch the transaction status below.</p>
                ) : (
                  <div className="flex gap-2 pt-1">
                    <button className="btn btn-accent" onClick={() => confirm(i, m.action!)} disabled={!canPropose}>
                      Confirm in wallet
                    </button>
                    <button className="btn" onClick={() => dismiss(i)}>Dismiss</button>
                  </div>
                )}
                {!canPropose && <p className="text-xs down">Connect a wallet to confirm this.</p>}
              </div>
            )}
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
