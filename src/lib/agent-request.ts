export const MAX_BODY_BYTES = 48 * 1024;
export const MAX_MESSAGE_CHARS = 6000;
export const MAX_HISTORY_CHARS = 24000;

export class RequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

// Additional per-instance guard; the production Vercel Firewall supplies
// the distributed limit. Memory alone does not span serverless instances.
const buckets = new Map<string, { until: number; count: number }>();
export function acceptRequest(key: string, now = Date.now()): boolean {
  for (const [ip, bucket] of buckets) if (bucket.until <= now) buckets.delete(ip);
  const bucket = buckets.get(key);
  if (bucket) return ++bucket.count <= 10;
  if (buckets.size >= 5000) return false;
  buckets.set(key, { until: now + 60_000, count: 1 });
  return true;
}

export async function readAgentRequest(req: Request) {
  if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new RequestError("Send JSON with Content-Type: application/json.", 415);
  const origin = req.headers.get("origin");
  if (req.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== new URL(req.url).origin)) throw new RequestError("This request must come from the app's own origin.", 403);
  if (Number(req.headers.get("content-length")) > MAX_BODY_BYTES) throw new RequestError("Request too large.", 413);
  const reader = req.body?.getReader();
  if (!reader) throw new RequestError("Invalid request.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new RequestError("Request too large.", 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new RequestError("Invalid JSON.", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new RequestError("Invalid request.", 400);
  const { messages } = body;
  if (!Array.isArray(messages) || !messages.length || messages.length > 16 || messages.some(m =>
    !m || !["user", "assistant"].includes(m.role) || typeof m.content !== "string" || !m.content.trim() || m.content.length > MAX_MESSAGE_CHARS
  )) throw new RequestError("Use up to 16 messages, each under 6,000 characters.", 400);
  if (messages.reduce((n, m) => n + m.content.length, 0) > MAX_HISTORY_CHARS) throw new RequestError("Conversation too long. Start a new conversation.", 413);
  if (messages.at(-1).role !== "user") throw new RequestError("The last message must be a user question.", 400);
  // Context is client-reported data, never additional system instructions.
  const context = body.vaultContext;
  if (context != null && (typeof context !== "object" || Array.isArray(context) || JSON.stringify(context).length > 8000)) throw new RequestError("Invalid vault context.", 400);
  const allowed = ["vaultAddress", "chain", "standard", "vaultName", "onchainName", "totalAssetsUpdatedAt", "totalAssetsReadFailed", "vaultSymbol", "assetAddress", "assetSymbol", "totalAssets", "totalAssetsScope", "totalShares", "connectedWallet", "userAssetBalance", "userShareBalance", "userAllowance", "userPendingDepositRequest", "userClaimableDeposit", "userPendingRedeemRequest", "userClaimableRedeem"];
  const vaultContext: Record<string, string | number | boolean | null> = {};
  for (const key of allowed) {
    const value = context?.[key];
    if (value === null || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value)) || (typeof value === "string" && value.length <= 500)) vaultContext[key] = value;
  }
  if (typeof vaultContext.connectedWallet !== "string" || !/^0x[\da-f]{40}$/i.test(vaultContext.connectedWallet)) vaultContext.connectedWallet = null;
  return { messages: messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content as string })), vaultContext };
}
