"use client";

import { useState } from "react";
import type { ProposedVaultAction } from "@ixswap1/vault-agent-sdk";

export type ProposedAction = ProposedVaultAction;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  action?: ProposedAction;
  actionStatus?: "pending" | "sent";
}

const ACTION_LABEL: Record<ProposedAction["action"], string> = {
  approve: "Approve allowance",
  requestDeposit: "Request deposit",
  requestRedeem: "Request redeem",
  claimDeposit: "Claim deposit",
  claimRedeem: "Claim redeem",
};

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
        "I'm the vault agent. Ask me about this vault, or tell me what you want to do — e.g. \"deposit 500 USDC\" — and I'll prepare it for you to confirm in your wallet. I can't sign anything myself.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  async function send() {
    const text = input.trim();
    if (!text || isLoading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: toHistory(nextMessages), vaultContext }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Agent request failed (${res.status})`);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.text ?? "",
          action: data.action ?? undefined,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "request failed"}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function confirm(index: number, action: ProposedAction) {
    onConfirmAction(action);
    setMessages((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], actionStatus: "sent" };
      return updated;
    });
  }

  function dismiss(index: number) {
    setMessages((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], action: undefined };
      return updated;
    });
  }

  return (
    <div className="flex flex-col rounded-lg border border-black/10 dark:border-white/10 h-[32rem]">
      <div className="px-4 py-3 border-b border-black/10 dark:border-white/10">
        <h2 className="font-medium text-sm">Vault agent</h2>
        <p className="text-xs opacity-60">
          Can propose transactions — your wallet always signs, never the agent.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            {m.content && (
              <div
                className={`inline-block max-w-[85%] rounded-lg px-3 py-2 whitespace-pre-wrap text-left ${
                  m.role === "user"
                    ? "bg-foreground text-background"
                    : "bg-black/5 dark:bg-white/10"
                }`}
              >
                {m.content}
              </div>
            )}

            {m.action && (
              <div className="mt-2 text-left inline-block w-full max-w-[85%] rounded-lg border border-black/10 dark:border-white/10 p-3 space-y-2">
                <div className="text-xs uppercase tracking-wide opacity-60">Proposed action</div>
                <div className="font-medium">
                  {ACTION_LABEL[m.action.action]}
                  {m.action.amount ? ` — ${m.action.amount}` : ""}
                </div>
                <div className="text-xs opacity-70">{m.action.reasoning}</div>
                {m.actionStatus === "sent" ? (
                  <p className="text-xs opacity-60">
                    Sent to your wallet — check the status below the dashboard.
                  </p>
                ) : (
                  <div className="flex gap-2 pt-1">
                    <button
                      className="rounded bg-foreground text-background px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                      onClick={() => confirm(i, m.action!)}
                      disabled={!canPropose}
                    >
                      Confirm in wallet
                    </button>
                    <button
                      className="rounded border border-black/10 dark:border-white/10 px-3 py-1.5 text-xs font-medium"
                      onClick={() => dismiss(i)}
                    >
                      Dismiss
                    </button>
                  </div>
                )}
                {!canPropose && (
                  <p className="text-xs text-red-500">Connect a wallet to confirm this.</p>
                )}
              </div>
            )}
          </div>
        ))}
        {isLoading && <div className="text-xs opacity-50">Thinking…</div>}
      </div>

      <div className="p-3 border-t border-black/10 dark:border-white/10 flex gap-2">
        <input
          className="flex-1 rounded border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm"
          placeholder="Ask, or tell me what to do…"
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
        <button
          className="rounded bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
          onClick={send}
          disabled={isLoading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
