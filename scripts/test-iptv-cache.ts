import assert from 'node:assert/strict';
import { iptvService } from '../src/services/iptvService';
import type { IptvChannel } from '../src/types/iptv';

const storage = new Map<string, string>();
const originalFetch = globalThis.fetch;
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const originalNow = Date.now;
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
} });
Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
const channels: IptvChannel[] = [
  { id: 'bo', name: 'Bolivia', logo: '', group: 'Deportes', country: 'BO', countryName: 'Bolivia', streamUrl: 'https://example.com/bo.m3u8' },
  { id: 'ar', name: 'Argentina', logo: '', group: 'Deportes', country: 'AR', countryName: 'Argentina', streamUrl: 'https://example.com/ar.m3u8' },
];

try {
  iptvService.clearCache();
  let requests = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  globalThis.fetch = async () => { requests++; await gate; return Response.json({ channels }); };
  const bo = iptvService.getChannels({ country: 'BO' });
  const ar = iptvService.getChannels({ country: 'AR' });
  release();
  assert.deepEqual((await bo).map((c) => c.id), ['bo']);
  assert.deepEqual((await ar).map((c) => c.id), ['ar']);
  assert.equal(requests, 1, 'Concurrent requests share one complete catalog');
  assert.equal((await iptvService.getChannels()).length, 2);
  assert.equal(requests, 1, 'Fresh cache avoids another request');

  Date.now = () => originalNow() + 6 * 60 * 1000;
  await iptvService.getChannels();
  assert.equal(requests, 2, 'Expired cache revalidates');
  globalThis.fetch = async () => { throw new Error('offline'); };
  assert.equal((await iptvService.getChannels({ forceRefresh: true })).length, 2);
  assert.ok(iptvService.getLoadError(), 'Stale fallback exposes an actionable error');
  globalThis.fetch = async (_url, options) => {
    assert.equal(options?.cache, 'no-store', 'Manual refresh bypasses the browser HTTP cache');
    return Response.json({ channels: [] });
  };
  assert.deepEqual(await iptvService.getChannels({ forceRefresh: true }), []);
  assert.equal(iptvService.getLoadError(), null, 'Successful empty response removes deleted channels and clears errors');

  iptvService.clearCache();
  storage.set('golbolivia_iptv_sports_cache_v2', JSON.stringify([{ id: 'invalid' }]));
  assert.deepEqual(iptvService.getCachedChannelsSync(), []);
  storage.set('golbolivia_iptv_favorites', '{}');
  assert.deepEqual(iptvService.getFavoriteChannelIds(), []);
  globalThis.fetch = async () => { throw new Error('offline'); };
  await assert.rejects(iptvService.getChannels(), /No pudimos actualizar/);
  globalThis.fetch = async () => Response.json({ channels });
  assert.equal((await iptvService.getChannels()).length, 2, 'Failed request can be retried');
  console.log('IPTV cache: concurrent loads, filters, expiry, stale fallback, empty catalog, invalid storage and retry passed.');
} finally {
  globalThis.fetch = originalFetch;
  Date.now = originalNow;
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
  else Reflect.deleteProperty(globalThis, 'localStorage');
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
  iptvService.setMemoryCache(null);
}
