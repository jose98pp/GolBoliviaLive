import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/services/iptvBackend.ts', import.meta.url), 'utf8');
const start = source.indexOf("iptvRouter.get('/sports/:id'");
const code = source.slice(start, source.indexOf('// GET /api/iptv/status', start));
const compiled = new Bun.Transpiler({ loader: 'ts', target: 'browser' }).transformSync(code);
let route: (req: any, res: any) => Promise<void>;
let channels = [{ id: 'custom/a', name: 'Mi canal', streamUrl: 'https://example.com/current.m3u8' }];
let fail = false;
new Function('iptvRouter', 'getOrRefreshSportsChannels', 'lastFetchTime', compiled)(
  { get: (_: string, handler: typeof route) => { route = handler; } },
  async (force: boolean) => { assert.equal(force, false); if (fail) throw new Error('offline'); return channels; }, 1234,
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
const found = await request('custom/a');
assert.equal(found.status, 200);
assert.equal(found.headers['Cache-Control'], 'no-store');
assert.equal(found.body.channel.streamUrl, 'https://example.com/current.m3u8');
assert.equal(found.body.channels, undefined);
channels[0] = { ...channels[0], streamUrl: 'https://example.com/updated.m3u8' };
assert.equal((await request('custom/a')).body.channel.streamUrl, 'https://example.com/updated.m3u8');
channels = [];
assert.equal((await request('custom/a')).body.code, 'CHANNEL_NOT_FOUND');
assert.equal((await request('custom/a')).status, 404);
fail = true;
const unavailable = await request('custom/a');
assert.equal(unavailable.status, 503);
assert.equal(unavailable.body.code, 'CATALOG_UNAVAILABLE');
console.log('Playback resolution: current channel, changed URL, deletion, no-store, API failure passed.');
