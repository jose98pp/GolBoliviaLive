import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transpileTypeScriptFixture } from './fixtures/bun-transpiler';

const source = await readFile(new URL('../src/services/iptvBackend.ts', import.meta.url), 'utf8');
const start = source.indexOf("iptvRouter.get('/sports/:id'");
const code = source.slice(start, source.indexOf('// GET /api/iptv/status', start));
const compiled = transpileTypeScriptFixture(code);
let route: (req: any, res: any) => Promise<void>;
let channels = [{ id: 'custom-iptv-a', name: 'Mi canal', streamUrl: 'https://example.com/current.m3u8' }];
let fail = false;
let catalog = [{ id: 'public-a', name: 'Público', streamUrl: 'https://example.com/public.m3u8', isCustom: false }] as Array<{ id: string; name: string; streamUrl: string; isCustom: boolean }>;
new Function('iptvRouter', 'getOrRefreshSportsChannels', 'lastFetchTime', 'refreshCustomChannels', compiled)(
  { get: (_: string, handler: typeof route) => { route = handler; } },
  async (force: boolean) => { assert.equal(force, false); return catalog; }, 1234,
  async () => { if (fail) throw new Error('offline'); return channels; },
);
async function request(id: string) {
  const result = { status: 200, headers: {} as Record<string, string>, body: null as any };
  const response = {
    setHeader: (key: string, value: string) => { result.headers[key] = value; },
    status: (status: number) => { result.status = status; return response; },
    json: (body: any) => { result.body = body; return response; },
  };
  await route!({ params: { id } }, response);
  return result;
}
const found = await request('custom-iptv-a');
assert.equal(found.status, 200);
assert.equal(found.headers['Cache-Control'], 'no-store');
assert.equal(found.body.channel.streamUrl, 'https://example.com/current.m3u8');
assert.equal(found.body.channels, undefined);
channels[0] = { ...channels[0], streamUrl: 'https://example.com/updated.m3u8' };
assert.equal((await request('custom-iptv-a')).body.channel.streamUrl, 'https://example.com/updated.m3u8');
catalog.push({ ...channels[0], isCustom: true });
channels = [];
assert.equal((await request('custom-iptv-a')).body.code, 'CHANNEL_NOT_FOUND');
assert.equal((await request('custom-iptv-a')).status, 404);
assert.equal((await request('public-a')).body.channel.id, 'public-a');
catalog = [];
assert.equal((await request('public-a')).status, 503, 'An incomplete public playlist must not confirm deletion');
fail = true;
const unavailable = await request('custom-iptv-a');
assert.equal(unavailable.status, 503);
assert.equal(unavailable.body.code, 'CATALOG_UNAVAILABLE');
console.log('Playback resolution: current custom/public channel, changed URL, confirmed deletion, stale custom entry, incomplete playlist, no-store and API failure passed.');
