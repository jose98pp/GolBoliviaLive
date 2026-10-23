import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import { AUDIENCE_LEASE_MS } from '../src/types/matchAudience';

const documents = new Map<string, any>();
let offline = false;
let serial = Promise.resolve();
const snapshot = (path: string) => ({ exists: () => documents.has(path), data: () => structuredClone(documents.get(path)) });
const runTransaction = (_db: unknown, callback: (tx: any) => Promise<any>) => {
  const operation = serial.then(async () => {
    const staged: [string, any, boolean][] = [];
    const result = await callback({ get: async (path: string) => snapshot(path), set: (path: string, data: any, options?: any) => staged.push([path, data, options?.merge]) });
    for (const [path, data, merge] of staged) documents.set(path, structuredClone(merge ? { ...documents.get(path), ...data } : data));
    return result;
  });
  serial = operation.then(() => {}, () => {});
  return operation;
};
const source = (await readFile(new URL('../src/services/matchAudienceStore.ts', import.meta.url), 'utf8')).replace(/^import .*\n/gm, '');
const code = await transform(source, { loader: 'ts', format: 'cjs' });
const makeStore = () => {
  const module = { exports: {} as any };
  new Function('module', 'exports', 'db', 'waitForFirestoreWriter', 'AUDIENCE_LEASE_MS', 'doc', 'collection', 'getDoc', 'getCountFromServer', 'query', 'where', 'runTransaction', code.code)(module, module.exports, {},
    async () => { if (offline) throw new Error('Fixture: Firestore unavailable'); }, AUDIENCE_LEASE_MS,
    (_db: unknown, ...parts: string[]) => parts.join('/'), (_db: unknown, ...parts: string[]) => parts.join('/'), async (path: string) => snapshot(path),
    async (query: any) => ({ data: () => ({ count: [...documents].filter(([path, value]) => path.startsWith(query.path + '/') && value.lastSeenAt > query.condition.value).length }) }),
    (path: string, condition: unknown) => ({ path, condition }), (_field: string, _op: string, value: number) => ({ value }), runTransaction);
  return module.exports;
};
let store = makeStore();
let now = 1000000;
const ping = (visitor: string, tab: string, play?: string, leave = false, match = 'match-a') => store.recordMatchAudience(match, visitor, tab, play, leave, now);
let stats = await ping('browser-a', 'tab-a');
assert.deepEqual([stats.activeNow, stats.uniqueVisitors, stats.peakViewers, stats.hlsPlays], [1, 1, 1, 0]);
await ping('browser-a', 'tab-a');
stats = await ping('browser-a', 'tab-b');
assert.equal(stats.activeNow, 1, 'Dos pestañas de un navegador cuentan una vez');
assert.equal(stats.uniqueVisitors, 1);
stats = await ping('browser-a', 'tab-a', undefined, true);
assert.equal(stats.activeNow, 1, 'Cerrar una pestaña no desconecta la otra');
stats = await ping('browser-a', 'tab-b', undefined, true);
assert.equal(stats.activeNow, 0);
await ping('browser-a', 'tab-a', 'play-a');
stats = await ping('browser-a', 'tab-a', 'play-a');
assert.equal(stats.hlsPlays, 1, 'Repeticiones del evento playing y solicitudes repetidas son idempotentes');
stats = await ping('browser-a', 'tab-a', 'play-b');
assert.equal(stats.hlsPlays, 2, 'Otra sesión de reproducción sí cuenta');
stats = await ping('browser-b', 'tab-c');
assert.deepEqual([stats.activeNow, stats.uniqueVisitors, stats.peakViewers], [2, 2, 2]);
now += AUDIENCE_LEASE_MS + 1;
stats = await store.getMatchAudienceStats('match-a', now);
assert.deepEqual([stats.activeNow, stats.uniqueVisitors, stats.peakViewers, stats.hlsPlays], [0, 2, 2, 2], 'Una desconexión caduca sin perder el historial');
stats = await ping('browser-a', 'new-tab');
assert.equal(stats.uniqueVisitors, 2, 'Volver no incrementa únicos');
stats = await ping('browser-a', 'tab-d', undefined, false, 'match-b');
assert.deepEqual([stats.uniqueVisitors, stats.hlsPlays], [1, 0], 'Otro partido e iframe tienen métricas independientes');
await Promise.all([ping('browser-c', 'tab-e'), ping('browser-d', 'tab-f')]);
stats = await store.getMatchAudienceStats('match-a', now);
assert.equal(stats.uniqueVisitors, 4, 'Las transacciones concurrentes no pierden visitantes');
assert.equal(stats.peakViewers, 3);
store = makeStore();
assert.equal((await store.getMatchAudienceStats('match-a', now)).uniqueVisitors, 4, 'El historial no depende de memoria del servidor');
offline = true;
await assert.rejects(ping('browser-z', 'tab-z'), /unavailable/);
offline = false;
assert.equal((await store.getMatchAudienceStats('match-a', now)).uniqueVisitors, 4, 'Un fallo no confirma ni altera el historial');
console.log('Audiencia: únicos, pestañas, cierre, caducidad, pico, HLS idempotente, concurrencia, aislamiento y persistencia comprobados.');
