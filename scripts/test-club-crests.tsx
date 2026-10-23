import { FOOTBALL_LEAGUES } from '../src/data/footballLeagues';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { transform } from 'esbuild';
import { ClubCrest } from '../src/components/ClubCrest';
import { normalizeCrestUrl, getClubCrestUrl, findClubCrest } from '../src/utils/clubCrests';
import { BOLIVIAN_CLUBS } from '../src/data/bolivianFootballData';
import type { Club } from '../src/types/football';

assert.equal(normalizeCrestUrl('javascript:alert(1)'), '');
assert.equal(normalizeCrestUrl('http://example.test/logo.png'), '');
assert.equal(normalizeCrestUrl('https://user:secret@example.test/logo.png'), '');
assert.equal(normalizeCrestUrl('/crests/../bad.png'), '');
assert.equal(normalizeCrestUrl(' https://example.test/logo.png '), 'https://example.test/logo.png');
for (const club of Object.values(BOLIVIAN_CLUBS)) {
  const url = getClubCrestUrl(club);
  if (url.startsWith('/crests/')) assert((await stat(new URL('../public' + url, import.meta.url))).size > 0);
}
const custom = { ...BOLIVIAN_CLUBS.bolivar, logoUrl: 'https://example.test/bolivar.png' };
assert.match(renderToStaticMarkup(<ClubCrest club={custom} />), /src="https:\/\/example.test\/bolivar.png"/);
assert.match(renderToStaticMarkup(<ClubCrest club={BOLIVIAN_CLUBS.real_madrid} />), /\/crests\/real_madrid.png/);
const fallback = renderToStaticMarkup(<ClubCrest club={{ name: 'Equipo Nuevo', shortName: 'Equipo Nuevo' }} />);
assert.match(fallback, /<svg/);
assert.match(fallback, />EN<\/text>/);
assert.doesNotMatch(fallback, /⚽|🐯/);
assert.equal(findClubCrest(BOLIVIAN_CLUBS.wilstermann, [{ names: ['Jorge Wilstermann'], logoUrl: 'https://example.test/w.png' }]), 'https://example.test/w.png');
assert.equal(findClubCrest(BOLIVIAN_CLUBS.bolivar, [{ names: ['Otro Bolívar'], logoUrl: 'https://example.test/wrong.png' }]), '');

// Guardado real del endpoint con persistencia simulada: ningún cambio de producción.
const source = await readFile(new URL('../serverApp.ts', import.meta.url), 'utf8');
const route = source.slice(source.indexOf("app.post(\n  ['/api/clubs',"), source.indexOf("app.delete(\n  ['/api/clubs/:id'"));
const code = await transform(`export const handler = ${route.slice(route.indexOf('async (req:'), route.lastIndexOf('\n);')).trim()};`, { loader: 'ts', format: 'cjs' });
const state: { clubs: Record<string, Club> } = { clubs: {} };
const module = { exports: {} as any };
let stored: Club | undefined;
let fail = false;
new Function('module', 'exports', 'state', 'normalizeCrestUrl', 'saveSingleClubToFirebase', 'persistState', 'broadcastSseEvent', code.code)(module, module.exports, state,
  normalizeCrestUrl, async (club: Club) => { if (fail) throw new Error('Fixture permission denied'); stored = structuredClone(club); }, () => {}, () => {});
const post = async (club: Partial<Club>) => {
  let status = 200; let body: any;
  const response: any = { status: (code: number) => { status = code; return response; }, json: (value: any) => { body = value; return response; } };
  await module.exports.handler({ body: club }, response);
  return { status, body };
};
assert.equal((await post(custom)).status, 200);
assert.equal(stored?.logoUrl, custom.logoUrl);
assert.equal(state.clubs.bolivar.logoUrl, custom.logoUrl);
fail = true;
assert.equal((await post({ ...custom, logoUrl: 'https://example.test/new.png' })).status, 503);
assert.equal(state.clubs.bolivar.logoUrl, custom.logoUrl, 'Un error no cambia el escudo ni confirma el guardado');
fail = false;
assert.equal((await post({ ...custom, logoUrl: 'javascript:alert(1)' })).status, 400);
assert.equal((await post({ ...custom, logoUrl: '' })).status, 200);
assert.equal(state.clubs.bolivar.logoUrl, '');
console.log('Escudos: archivos locales, URL segura, respaldo, coincidencia de equipos y guardado confirmado comprobados.');

const originalFetch = globalThis.fetch;
let catalogRequests = 0;
try {
  globalThis.fetch = (async () => { catalogRequests++; return { ok: true, json: async () => ({ teams: [{ names: ['Bolívar'], logoUrl: 'https://example.test/bolivar-official.png' }] }) }; }) as any;
  const { resolveClubCrests } = await import('../src/services/clubCrests');
  const [first, second] = await Promise.all([resolveClubCrests([BOLIVIAN_CLUBS.bolivar]), resolveClubCrests([BOLIVIAN_CLUBS.bolivar])]);
  assert.equal(first.bolivar, 'https://example.test/bolivar-official.png');
  assert.equal(second.bolivar, first.bolivar);
  assert.equal(catalogRequests, 1, 'Varios componentes comparten una sola consulta del catálogo');
  assert.deepEqual(await resolveClubCrests([custom]), {}, 'El catálogo no sustituye un escudo guardado por el administrador');
} finally { globalThis.fetch = originalFetch; }
console.log('Escudos automáticos: coincidencia, consulta compartida y prioridad de imágenes guardadas comprobadas.');

const catalogRoute = source.slice(source.indexOf("app.get(['/api/football-api/teams'"), source.indexOf("app.get(['/api/football-api/matches'"));
const catalogHandler = catalogRoute.slice(catalogRoute.indexOf('async (req:'), catalogRoute.lastIndexOf('\n});') + 2).trim();
const catalogCode = await transform(`export const handler = ${catalogHandler};`, { loader: 'ts', format: 'cjs' });
const catalogModule = { exports: {} as any };
let upstreamCalls = 0;
new Function('module', 'exports', 'clubCrestCache', 'normalizeCrestUrl', 'fetch', 'FOOTBALL_LEAGUES', catalogCode.code)(catalogModule, catalogModule.exports, new Map(), normalizeCrestUrl,
  async () => { upstreamCalls++; return { ok: true, json: async () => ({ sports: [{ leagues: [{ teams: [
    { team: { displayName: 'Bolívar', logos: [{ href: 'https://example.test/bolivar.png' }] } },
    { team: { displayName: 'Inválido', logos: [{ href: 'javascript:alert(1)' }] } },
  ] }] }] }) }; }, FOOTBALL_LEAGUES);
const requestCatalog = async (league: string) => {
  let status = 200; let body: any;
  const res: any = { status: (value: number) => { status = value; return res; }, json: (value: any) => { body = value; return res; }, setHeader: () => {} };
  await catalogModule.exports.handler({ query: { league } }, res);
  return { status, body };
};
const catalog = await requestCatalog('bol.1');
assert.equal(catalog.status, 200);
assert(catalog.body.teams.every((team: any) => team.logoUrl === 'https://example.test/bolivar.png'));
assert.equal(upstreamCalls, 2);
await requestCatalog('bol.1');
assert.equal(upstreamCalls, 2, 'El servidor conserva la caché del catálogo');
assert.equal((await requestCatalog('../../private')).status, 400);
console.log('Catálogo de escudos: formato ESPN, caché, ligas limitadas y rechazo de imágenes inseguras comprobados.');
