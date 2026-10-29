import { normalizeScheduledAt } from '../src/utils/eventSchedule';
import { buildEventSourcesPatch } from '../src/utils/eventSources';
import { sanitizeSportsEvent } from '../src/utils/sportsEvents';
import { FOOTBALL_COMPETITIONS } from '../src/data/footballLeagues';
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
new Function('module', 'exports', 'state', 'normalizeMatchIptvSource', 'normalizeExternalPlayerUrl', 'saveLiveEventToFirebase', 'logConfirmationToFirebase', 'persistState', 'broadcastSseEvent', 'FOOTBALL_COMPETITIONS', 'sanitizeSportsEvent', 'buildEventSourcesPatch', 'normalizeScheduledAt', eventCode.code)(eventModule, eventModule.exports,
  state, normalizeMatchIptvSource, normalizeExternalPlayerUrl, saveLiveEventToFirebase, async () => {}, () => {}, () => {}, FOOTBALL_COMPETITIONS, sanitizeSportsEvent, buildEventSourcesPatch, normalizeScheduledAt);
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

const basketball = { ...hls, version: load().version, sports: { sport: 'basketball', competition: 'NBA', participants: [{ name: 'Local NBA', score: 142 }, { name: 'Visitante NBA', score: 135 }], state: 'final' } } as LiveEvent;
assert.equal((await postEvent(basketball)).status, 200);
assert.equal(load().sports.participants[0].score, 142, 'El resultado de básquet sobrevive sin el límite de goles de fútbol');
assert.equal(load().isLive, false, 'Un evento finalizado no conserva el indicador en vivo del fútbol');
assertConfirmedMatchSignal(hls, load());
const invalidSports = { ...basketball, version: load().version, sports: { ...basketball.sports!, competitionLogo: 'javascript:alert(1)' } };
assert.equal((await postEvent(invalidSports)).status, 400);
assert.equal(load().sports.participants[0].score, 142, 'Un error no modifica el evento guardado');
await saveLiveEventToFirebase({ ...load(), sports: null });
assert.equal(load().sports, null, 'Cambiar a fútbol limpia los datos deportivos anteriores');
console.log('Persistencia multideporte: guardar/recargar puntos, conservar IPTV/iframe, rechazar imágenes inseguras y volver a fútbol comprobados.');

const multipleSources = buildEventSourcesPatch([
  { id: 'source-one', name: 'Canal uno', type: 'hls', url: 'https://example.test/one.m3u8', channelId: 'one' },
  { id: 'source-two', name: 'Canal dos', type: 'iframe', url: 'https://streamxhd.st/live1.php?stream=dsports', channelId: 'two' },
  { id: 'source-three', name: 'Mi transmisión', type: 'hls', url: 'https://example.test/live/partido/index.m3u8', waitForBroadcast: true },
], 'source-two');
const multiplePayload = { ...load(), ...multipleSources, version: load().version } as LiveEvent;
assert.equal((await postEvent(multiplePayload)).status, 200);
assert.equal(load().sources.length, 3);
assert.equal(load().defaultSourceId, 'source-two');
assertConfirmedMatchSignal(multiplePayload, load());
const reorderedKeys = { ...load(), sources: load().sources.map((source: any) => Object.fromEntries(Object.entries(source).reverse())) };
assertConfirmedMatchSignal(multiplePayload, reorderedKeys);
assert.equal((await postEvent({ ...multiplePayload, version: load().version, defaultSourceId: 'missing' })).status, 400);
assert.equal(load().sources.length, 3);
const emptyPayload = { ...load(), ...buildEventSourcesPatch([], ''), version: load().version } as LiveEvent;
assert.equal((await postEvent(emptyPayload)).status, 200);
assert.equal(load().sources.length, 0);
assertConfirmedMatchSignal(emptyPayload, load());
console.log('Fuentes por evento: guardar/recargar tres opciones, fuente inicial, orden de claves Firestore, validación y eliminación completa comprobados.');

for (const league of ['arg.copa_arg', 'bra.copa_do_brazil', 'esp.copa_del_rey', 'eng.fa', 'mex.1', 'usa.1', 'mex.women', 'usa.nwsl', 'conmebol.america_femenina', 'fifa.world_u17_womens', 'conmebol.sudamericano.sub20', 'ksa.1', 'afc.champions']) {
  const payload = { ...load(), version: load().version, espnLink: { eventId: '123456', league, enabled: true } } as LiveEvent;
  assert.equal((await postEvent(payload)).status, 200, `El servidor acepta la competición ${league}`);
  assert.deepEqual(load().espnLink, payload.espnLink, 'El vínculo de la copa sobrevive al guardado y recarga');
}
assert.equal((await postEvent({ ...load(), version: load().version, espnLink: { eventId: '123456', league: 'unknown.cup', enabled: true } })).status, 400);

const startPayload = { ...load(), version: load().version, scheduledAt: '2026-11-01T20:30:00-04:00' } as LiveEvent;
assert.equal((await postEvent(startPayload)).status, 200);
assert.equal(load().scheduledAt, '2026-11-02T00:30:00.000Z');
assertConfirmedMatchSignal(startPayload, load());
assert.throws(() => assertConfirmedMatchSignal(startPayload, { ...load(), scheduledAt: null }), /fecha y hora/);
assert.equal((await postEvent({ ...load(), version: load().version, scheduledAt: '2026-02-30T20:00:00Z' })).status, 400);
assert.equal(load().scheduledAt, '2026-11-02T00:30:00.000Z');
const withoutStart = { ...load(), version: load().version }; delete withoutStart.scheduledAt;
assert.equal((await postEvent(withoutStart)).status, 200);
assert.equal(load().scheduledAt, '2026-11-02T00:30:00.000Z', 'Una actualización parcial conserva la fecha');
assert.equal((await postEvent({ ...load(), version: load().version, scheduledAt: null })).status, 200);
assert.equal(load().scheduledAt, null, 'El administrador puede quitar un horario no confirmado');
console.log('Horario: normalización UTC, guardado/recarga, confirmación, fecha inválida, preservación parcial y borrado comprobados.');
