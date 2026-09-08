// Run with CMC_API_KEY set (or node --env-file=.env.local --experimental-transform-types ...).
// Capture the actual application client, its call log, and full upstream responses.
import { mkdir, writeFile } from 'node:fs/promises';
import { rwaList, rwaQuotes, rwaInfo, rwaIssuers } from '../src/lib/cmc.ts';

const calls = [];
async function capture(fn) {
  const log = [];
  const response = await fn(log);
  calls.push({request: log[0], response});
  return response;
}
await capture(log => rwaList({asset_type:'stock',limit:5,sort:'tokenized_market_cap'},log));
await capture(log => rwaQuotes(['NVDA','GOLD'],log));
await capture(log => rwaInfo(['NVDA'],log));
const issuers = await capture(log => rwaIssuers({limit:5},log));
const issuerId = issuers.data?.issuers?.[0]?.issuer_id;
if (!issuerId) throw new Error('No issuer returned; evidence is incomplete');
await capture(log => rwaIssuers({issuer_id:issuerId},log));
const dir = new URL('../docs/evidence/',import.meta.url);
await mkdir(dir,{recursive:true});
await writeFile(new URL('cmc-live.json',dir),JSON.stringify({captured_at:new Date().toISOString(),calls},null,2)+'\n');
console.log(`Captured ${calls.length} successful CMC calls using the app client`);
