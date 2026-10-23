import { FOOTBALL_LEAGUES } from '../src/data/footballLeagues';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import { assertConfirmedMatchSignal, getStreamUrlForEvent, normalizeExternalPlayerUrl, normalizeMatchIptvSource } from '../src/utils/streamUtils';
import { buildMatchStreamPatch } from '../src/utils/matchStreamConfig';
import type { LiveEvent } from '../src/types/football';

// Ejecuta las funciones reales de persistencia con una transacción en memoria, sin SDK ni credenciales.
const file = (await readFile(new URL('../src/services/firebase.ts', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const save = file.slice(file.indexOf('export async function saveLiveEventToFirebase('), file.indexOf('export async function saveMatchScoreboardFirebase('));
const hydrate = file.slice(file.indexOf('function hydrateLiveEventDoc('), file.indexOf('export async function getLiveEventsFromFirebase('));
const compiled = await transform(save + '\n' + hydrate + '\nexport { hydrateLiveEventDoc };', { loader: 'ts', format: 'cjs' });
const documents = new Map<string, any>();
let rejectWrite = false;
const module = { exports: {} as any };
const transaction = async (_db: unknown, work: (tx: any) => Promise<any>) => {
  if (rejectWrite) throw new Error('permission-denied fixture');
  return work({ get: async (id: string) => ({ exists: () => documents.has(id), data: () => documents.get(id) }),
    set: (id: string, data: any) => documents.set(id, structuredClone({ ...documents.get(id), ...data })) });
};
new Function('module', 'exports', 'runTransaction', 'writeGate', 'sanitizeClubId', 'validateScore', 'validateMinute', 'doc', 'db', compiled.code)(
  module, module.exports, transaction, Promise.resolve(), (id: string) => id, (n: number) => n, (n: number) => n,
  (_db: unknown, collection: string, id: string) => `${collection}/${id}`, {});
const { saveLiveEventToFirebase, hydrateLiveEventDoc } = module.exports;
const base: LiveEvent = { espnLink: { eventId: '123456', league: 'arg.1', enabled: true }, id: 'partido-fixture', title: 'Partido fixture', homeTeam: 'bolivar', awayTeam: 'strongest', isLive: true,
  primaryProvider: 'external', externalSource: { url: 'https://streamxhd.st/live1.php?stream=dsports' },
  iptvSource: { channelId: 'custom-fixture', channelName: 'DSports', streamUrl: 'https://streamxhd.st/live1.php?stream=dsports', sourceType: 'iframe' },
  fallbackOrder: ['external', 'iptv', 'cloudflare'], homeScore: 2, awayScore: 1, activeStreamSource: 'obs', broadcastMode: 'obs_custom' };
const load = (id = base.id) => hydrateLiveEventDoc({ id, data: () => documents.get(`liveEvents/${id}`) });
const result = await saveLiveEventToFirebase(base);
let restored = load();
assert.deepEqual(restored.espnLink, base.espnLink, 'El vínculo ESPN sobrevive a guardar y recargar');
assert.equal(restored.externalSource.url, base.externalSource!.url, 'La URL iframe sobrevive a guardar y recargar');
assert.equal(restored.iptvSource.channelId, 'custom-fixture');
assert.equal(getStreamUrlForEvent(restored), base.externalSource!.url);
assertConfirmedMatchSignal(base, restored);
assert.equal(restored.version, result.version);
const hls = { ...restored, primaryProvider: 'iptv', externalSource: null,
  iptvSource: normalizeMatchIptvSource({ channelId: 'hls-fixture', channelName: 'HLS', streamUrl: 'http://example.test:8000/live.m3u8' }), fallbackOrder: ['iptv', 'cloudflare'] } as LiveEvent;
await saveLiveEventToFirebase(hls);
restored = load();
assert.equal(restored.externalSource, null, 'Quitar iframe limpia el campo anterior');
assert.equal(getStreamUrlForEvent(restored), hls.iptvSource!.streamUrl);
assert.equal(restored.homeScore, 2, 'Señal y marcador se guardan juntos');
assertConfirmedMatchSignal(hls, restored);
await assert.rejects(saveLiveEventToFirebase({ ...base, version: 1 }), /Conflicto/, 'Una versión antigua no reemplaza HLS por iframe');
assert.equal(load().primaryProvider, 'iptv');
const before = structuredClone(documents.get('liveEvents/partido-fixture'));
rejectWrite = true;
await assert.rejects(saveLiveEventToFirebase({ ...restored, primaryProvider: 'external' }), /permission-denied/);
assert.deepEqual(documents.get('liveEvents/partido-fixture'), before, 'Un fallo no produce un falso guardado');
rejectWrite = false;
await saveLiveEventToFirebase({ ...base, id: 'partido-otro' });
assert.equal(load().primaryProvider, 'iptv', 'Asignar una señal a otro partido no altera el primero');
assert.throws(() => assertConfirmedMatchSignal(base, { ...base, externalSource: null }), /no confirmó/);
assert.throws(() => assertConfirmedMatchSignal(hls, { ...hls, iptvSource: null }), /no confirmó/);
const patch = buildMatchStreamPatch({ backupVideoUrl: '', chatMode: 'all' });
assert.deepEqual(patch, { backupVideoUrl: '' }, 'Un cambio global no introduce título o proveedor antiguos');
assert.deepEqual(buildMatchStreamPatch({ primaryProvider: 'iptv' }), { primaryProvider: 'iptv' });
assert.equal(normalizeMatchIptvSource(base.iptvSource)?.sourceType, 'iframe');
console.log('Persistencia de partidos: guardar/recargar iframe y HLS, eliminación, versiones, fallos y aislamiento comprobados con código real.');

// Ejecutar el endpoint real de sincronización con Firestore y respuesta HTTP simulados.
const server = (await readFile(new URL('../serverApp.ts', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const route = server.slice(server.indexOf("app.post(\n  ['/api/streams/config'"), server.indexOf('// 6.5 Multi-Provider'));
const handler = route.slice(route.indexOf('async (req:'), route.lastIndexOf('\n);')).trim();
const routeCode = await transform(`export const handle = ${handler};`, { loader: 'ts', format: 'cjs' });
const routeModule = { exports: {} as any };
const state = { scoreboard: {}, liveEvents: [load()], streamSettings: { title: 'Título global antiguo', primaryProvider: 'cloudflare' } };
new Function('module', 'exports', 'state', 'ensureStateLoaded', 'buildMatchStreamPatch', 'saveLiveEventToFirebase',
  'persistState', 'persistStreamSettingsToFirestore', 'getPublicStreamPayload', 'broadcastSseEvent', routeCode.code)(routeModule, routeModule.exports,
  state, async () => {}, buildMatchStreamPatch, saveLiveEventToFirebase, () => {}, async () => {}, () => state.streamSettings, () => {});
const synchronize = async (body: Record<string, unknown>) => {
  let status = 200; let response: any;
  const res: any = { status: (code: number) => { status = code; return res; }, json: (data: any) => { response = data; return res; } };
  await routeModule.exports.handle({ body }, res);
  return { status, response };
};
const configured = await synchronize({ eventId: base.id, backupVideoUrl: '' });
assert.equal(configured.status, 200);
assert.equal(configured.response.event.primaryProvider, 'iptv');
assert.equal(configured.response.event.title, base.title, 'Sincronizar respaldo no copia el título global antiguo');
assert.equal(load().backupVideoUrl, '', 'El endpoint persiste también la eliminación de un respaldo');
assert.equal(configured.response.event.version, load().version);
const eventBeforeFailure = structuredClone(state.liveEvents[0]);
rejectWrite = true;
const failed = await synchronize({ eventId: base.id, primaryProvider: 'external' });
assert.equal(failed.status, 503);
assert.deepEqual(state.liveEvents[0], eventBeforeFailure, 'Una sincronización fallida no cambia el proveedor en memoria');
rejectWrite = false;
assert.equal((await synchronize({ backupVideoUrl: '' })).status, 400);
assert.equal((await synchronize({ eventId: 'missing' })).status, 404);
console.log('Endpoint de configuración: persiste por partido, conserva proveedor/título, confirma versión y rechaza errores sin cambiar memoria.');

// El cliente real no sustituye respuestas incompletas por el formulario que intentó guardar.
const clientFile = (await readFile(new URL('../src/services/apiClient.ts', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const method = clientFile.slice(clientFile.indexOf('  public async saveLiveEvent('), clientFile.indexOf('  public async deleteLiveEvent(')).replace('public async', 'async');
const clientCode = await transform(`export class Client { getAuthHeaders() { return {}; } ${method} }`, { loader: 'ts', format: 'cjs' });
let responseBody: any = { success: true, event: { ...base, version: 2 }, version: 2 };
const clientModule = { exports: {} as any };
new Function('module', 'exports', 'assertConfirmedMatchSignal', 'fetch', clientCode.code)(clientModule, clientModule.exports,
  assertConfirmedMatchSignal, async () => ({ ok: true, json: async () => responseBody }));
const client = new clientModule.exports.Client();
assert.equal((await client.saveLiveEvent(base)).version, 2);
responseBody = { success: true };
await assert.rejects(client.saveLiveEvent(base), /no confirmó/);
responseBody = { success: true, event: { ...base, externalSource: null } };
await assert.rejects(client.saveLiveEvent(base), /no confirmó/);
responseBody = { success: true, event: { ...base, id: 'otro-partido' } };
await assert.rejects(client.saveLiveEvent(base), /no confirmó/);
console.log('Cliente real: rechaza confirmaciones incompletas, señales perdidas y respuestas de otro partido.');

// La cola real de sincronización separa los cambios diferidos por partido.
const appFile = (await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const queueStart = appFile.indexOf('    if (!activeEventId) return;\n    pendingStreamSync.set');
const queueBody = appFile.slice(queueStart, appFile.indexOf('\n  };', queueStart));
const queueCode = await transform(`export function enqueue(activeEventId, newSettings) { ${queueBody} }`, { loader: 'ts', format: 'cjs' });
const queueModule = { exports: {} as any };
const callbacks = new Map<number, () => void>();
let timerId = 0;
const requests: any[] = [];
new Function('module', 'exports', 'pendingStreamSync', 'streamSyncTimers', 'setTimeout', 'clearTimeout', 'STREAM_SYNC_DEBOUNCE_MS', 'apiClient', 'setLiveEvents', queueCode.code)(queueModule, queueModule.exports,
  new Map(), new Map(), (callback: () => void) => { callbacks.set(++timerId, callback); return timerId; }, (id: number) => callbacks.delete(id), 500,
  { syncStreamConfig: async (patch: any) => { requests.push(patch); return {}; } }, () => {});
queueModule.exports.enqueue('partido-a', { customVideoUrl: 'https://example.test/a.m3u8' });
queueModule.exports.enqueue('partido-b', { customVideoUrl: 'https://example.test/b.m3u8' });
queueModule.exports.enqueue('partido-a', { backupVideoUrl: '' });
for (const callback of [...callbacks.values()]) callback();
assert.equal(requests.length, 2);
assert.equal(requests.find(request => request.eventId === 'partido-a').customVideoUrl, 'https://example.test/a.m3u8');
assert.equal(requests.find(request => request.eventId === 'partido-b').customVideoUrl, 'https://example.test/b.m3u8');
assert.equal(requests.find(request => request.eventId === 'partido-b').backupVideoUrl, undefined);
console.log('Cola de sincronización: cambiar de partido no mezcla ni pierde las señales pendientes.');

const eventRoute = server.slice(server.indexOf("app.post(\n  ['/api/live-events',"), server.indexOf("app.delete(\n  ['/api/live-events/:id'"));
const eventHandler = eventRoute.slice(eventRoute.indexOf('async (req:'), eventRoute.lastIndexOf('\n);')).trim();
const eventCode = await transform(`export const handle = ${eventHandler};`, { loader: 'ts', format: 'cjs' });
const eventModule = { exports: {} as any };
new Function('module', 'exports', 'state', 'normalizeMatchIptvSource', 'normalizeExternalPlayerUrl', 'saveLiveEventToFirebase', 'logConfirmationToFirebase', 'persistState', 'broadcastSseEvent', 'FOOTBALL_LEAGUES', eventCode.code)(eventModule, eventModule.exports,
  state, normalizeMatchIptvSource, normalizeExternalPlayerUrl, saveLiveEventToFirebase, async () => {}, () => {}, () => {}, FOOTBALL_LEAGUES);
const postEvent = async (body: LiveEvent) => {
  let status = 200; let response: any;
  const res: any = { status: (code: number) => { status = code; return res; }, json: (data: any) => { response = data; return res; } };
  await eventModule.exports.handle({ body }, res);
  return { status, response };
};
const savedIframe = await postEvent({ ...base, version: load().version });
assert.equal(savedIframe.status, 200);
assert.equal(savedIframe.response.event.iptvSource.sourceType, 'iframe', 'El endpoint conserva la referencia del canal iframe');
assertConfirmedMatchSignal(base, load());
assert.equal(savedIframe.response.version, load().version);
const badSource = await postEvent({ ...base, iptvSource: { ...base.iptvSource!, streamUrl: 'https://example.test/invalid.mpd' }, version: load().version });
assert.equal(badSource.status, 400, 'Una señal incompatible da error, nunca se borra silenciosamente');
const savedHls = await postEvent({ ...hls, version: load().version });
assert.equal(savedHls.status, 200);
assertConfirmedMatchSignal(hls, load());
console.log('Endpoint de partidos: guardar y recargar iframe/HLS conserva la señal y rechaza fuentes incompatibles.');

const obsPatch = buildMatchStreamPatch({ customVideoUrl: 'https://example.test/new-obs.m3u8' }, { ...base, cloudflare: { liveInputId: 'input-fixture', playbackUrl: 'https://example.test/old.m3u8' } });
assert.equal(obsPatch.cloudflare?.playbackUrl, 'https://example.test/new-obs.m3u8');
assert.equal(obsPatch.cloudflare?.liveInputId, 'input-fixture');
assert.equal(getStreamUrlForEvent({ ...base, ...obsPatch, primaryProvider: 'cloudflare' }), 'https://example.test/new-obs.m3u8', 'La URL OBS guardada también es la que consume el reproductor');
