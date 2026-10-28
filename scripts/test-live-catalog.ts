import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transpileTypeScriptFixture } from './fixtures/bun-transpiler';
import { createLiveEventCatalog } from '../src/services/liveEventCatalog';

let current = [{ id: 'kept' }];
const failed = createLiveEventCatalog({ read: async () => { throw new Error('offline'); }, get: () => current, set: v => { current = v; }, timeoutMs: 10 });
assert.equal((await failed.load()).stale, true);
assert.deepEqual(current, [{ id: 'kept' }], 'Failed reads cannot erase the catalog');
let resolveRead!: (v: { id: string }[]) => void;
let reads = 0;
const pending = new Promise<{ id: string }[]>(resolve => { resolveRead = resolve; });
const delayed = createLiveEventCatalog({ read: () => { reads++; return pending; }, get: () => current, set: v => { current = v; }, timeoutMs: 10 });
assert.equal((await delayed.load()).stale, true);
await delayed.load(); assert.equal(reads, 1, 'Concurrent callers share one read');
current = [{ id: 'admin-created' }]; resolveRead([]);
await new Promise(resolve => setTimeout(resolve, 0));
assert.deepEqual(current, [{ id: 'admin-created' }], 'Late initial reads cannot overwrite an administrator write');
const empty = createLiveEventCatalog({ read: async () => [], get: () => current, set: v => { current = v; } });
const confirmed = await empty.load(); assert.equal(confirmed.catalogConfirmed, true); assert.deepEqual(confirmed.events, [], 'A successful empty read confirms real deletions');

const source = await readFile(new URL('../src/services/firebase.ts', import.meta.url), 'utf8');
const start = source.indexOf('export async function getLiveEventsFromFirebase(');
const code = source.slice(start, source.indexOf('export function subscribeLiveEventsFirebase', start));
const compiled = transpileTypeScriptFixture(code).replace('export async function', 'async function');
let reject = true;
const reader = new Function('collection', 'db', 'getDocs', 'getDocsFromServer', 'hydrateLiveEventDoc', 'console', `${compiled}; return getLiveEventsFromFirebase;`)(
  () => ({}), {}, async () => { throw new Error('SDK fallback'); }, async () => { if (reject) throw new Error('offline'); return { empty: true }; }, () => null, { warn() {} });
await assert.rejects(reader({ strict: true }), /offline/);
assert.deepEqual(await reader(), []);
reject = false; assert.deepEqual(await reader({ strict: true }), []);
const server = await readFile(new URL('../serverApp.ts', import.meta.url), 'utf8');
const route = server.slice(server.indexOf("app.get(['/api/live-events',"), server.indexOf("app.get(['/api/live-events/:id',"));
assert(!route.includes('ensureStateLoaded'), 'Public catalog must not wait for chat, settings, or clubs');
assert(route.includes('status(503)') && route.includes('catalogConfirmed'), 'Unconfirmed empty catalogs must not be returned as success');
const detail = server.slice(server.indexOf("app.get(['/api/live-events/:id',"), server.indexOf('\napp.post(', server.indexOf("app.get(['/api/live-events/:id',")));
assert(detail.includes('status(503)') && detail.includes('!snapshot.catalogConfirmed'), 'Unconfirmed detail must not report a false deletion');
console.log('Catalog: timeout, deduplication, stale retention, concurrent writes, confirmed deletion, strict Firebase errors, independent API route passed.');
