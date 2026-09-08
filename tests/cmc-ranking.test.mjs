// Regression: CMC defaults to ascending when sort_dir is omitted.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rwaList } from '../src/lib/cmc.ts';

test('top assets request descending market cap and accept CMC string success code', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.CMC_API_KEY;
  process.env.CMC_API_KEY = 'test-only';
  let requested;
  globalThis.fetch = async (url) => {
    requested = new URL(url);
    return Response.json({status:{error_code:'0',credit_count:1}, data:{rwa_assets:[{symbol:'TOP'}]}});
  };
  try {
    const log = [];
    const result = await rwaList({asset_type:'stock',limit:5,sort:'tokenized_market_cap'}, log);
    assert.equal(requested.searchParams.get('sort_dir'), 'desc');
    assert.equal(requested.searchParams.get('sort'), 'tokenized_market_cap');
    assert.equal(result.data.rwa_assets[0].symbol, 'TOP');
    assert.equal(log[0].creditCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.CMC_API_KEY;
    else process.env.CMC_API_KEY = originalKey;
  }
});
