import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTvlUsd, dataStatus, ONCHAIN_MAX_AGE } from '../src/lib/data-status.ts';
const now = Date.parse('2026-09-05T12:00:00Z');

test('zero is distinct from missing, invalid and positive readings', () => {
  assert.equal(dataStatus(0, now, ONCHAIN_MAX_AGE, now), 'ZERO');
  assert.equal(dataStatus(0.004, now, ONCHAIN_MAX_AGE, now), 'LIVE');
  for (const value of [null, undefined, NaN, Infinity]) {
    assert.equal(dataStatus(value, now, ONCHAIN_MAX_AGE, now), 'UNAVAILABLE');
  }
});
test('cached zero and positive readings become stale after age limit or failed refresh', () => {
  for (const value of [0, 100]) {
    assert.equal(dataStatus(value, now - ONCHAIN_MAX_AGE - 1, ONCHAIN_MAX_AGE, now), 'STALE');
    assert.equal(dataStatus(value, now, ONCHAIN_MAX_AGE, now, true), 'STALE');
  }
});
test('unknown dates never imply live data; small render-clock lag is tolerated', () => {
  for (const timestamp of [undefined, 'invalid', 0, now + 120_000]) {
    assert.equal(dataStatus(100, timestamp, ONCHAIN_MAX_AGE, now), 'STALE');
  }
  assert.equal(dataStatus(100, now + 1000, ONCHAIN_MAX_AGE, now), 'LIVE');
  assert.equal(dataStatus(100, new Date(now).toISOString(), ONCHAIN_MAX_AGE, now), 'LIVE');
});

test('small positive TVL never rounds to a false zero', () => {
  assert.equal(formatTvlUsd(0.004519), '<$0.01');
  assert.equal(formatTvlUsd(0), '$0');
  assert.equal(formatTvlUsd(123.45), '$123.45');
  assert.equal(formatTvlUsd(NaN), 'Unavailable');
});
