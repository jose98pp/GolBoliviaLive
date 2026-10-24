import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseSportsEspn, sanitizeSportsEvent, SPORTS_COMPETITIONS } from '../src/utils/sportsEvents';
import { getMatchStatusInfo } from '../src/utils/matchStatus';
import { SportsScoreboard } from '../src/components/SportsScoreboard';
import { getSportsLive } from '../src/services/sportsApi';
import type { SportsEvent } from '../src/types/sports';
import type { LiveEvent } from '../src/types/football';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';

const nbaRaw = { leagues: [{ logos: [{ href: 'https://example.test/nba.png' }] }], events: [{ id: '100', date: '2026-10-24T00:00Z', status: { type: { state: 'in', name: 'STATUS_IN_PROGRESS' }, period: 3, displayClock: '02:54' }, competitions: [{ id: '100', competitors: [{ homeAway: 'away', score: '128', team: { displayName: 'Boston', logo: 'https://example.test/boston.png' } }, { homeAway: 'home', score: '135', team: { displayName: 'Los Angeles' } }] }] }] };
const nba = parseSportsEspn(nbaRaw, 'nba')[0].data;
assert.equal(nba.participants[0].name, 'Los Angeles'); assert.equal(nba.participants[0].score, 135); assert.equal(nba.participants[1].score, 128);
assert.equal(nba.phase, '3º cuarto'); assert.equal(nba.clock, '02:54'); assert.equal(nba.state, 'live');
assert.equal(sanitizeSportsEvent(nba)!.participants[0].score, 135, 'Los puntos no se limitan a 50 goles');
const overtime = structuredClone(nbaRaw); overtime.events[0].status.period = 5;
assert.equal(parseSportsEspn(overtime, 'nba')[0].data.phase, 'Prórroga');
const ncaa = structuredClone(nbaRaw); ncaa.events[0].status.period = 2;
assert.equal(parseSportsEspn(ncaa, 'mens-college-basketball')[0].data.phase, '2ª mitad');
const mmaRaw = { events: [{ id: '200', date: '2026-10-24T21:00Z', competitions: [
  { id: '201', status: { type: { name: 'STATUS_IN_PROGRESS', state: 'in' }, period: 2, displayClock: '03:15' }, competitors: [{ athlete: { displayName: 'Peleadora A', headshot: { href: 'https://example.test/a.png' } } }, { athlete: { displayName: 'Peleadora B' } }] },
  { id: '202', status: { type: { name: 'STATUS_FINAL', state: 'post', completed: true, detail: 'KO/TKO' }, period: 1, displayClock: '01:20' }, competitors: [{ athlete: { displayName: 'Peleador C' }, winner: true }, { athlete: { displayName: 'Peleador D' }, winner: false }] },
] }] };
const fights = parseSportsEspn(mmaRaw, 'ufc'); assert.equal(fights.length, 2); assert.equal(fights[0].data.source!.boutId, '201');
assert.equal(fights[0].data.participants[0].imageUrl, 'https://example.test/a.png');
assert.equal(fights[0].data.phase, 'Round 2'); assert.equal(fights[0].data.clock, '03:15'); assert.equal(fights[0].data.participants[0].score, undefined);
assert.equal(parseSportsEspn(mmaRaw, 'ufc', '200', '202')[0].data.participants[0].name, 'Peleador C');
assert.equal(parseSportsEspn(mmaRaw, 'ufc', '200', '202')[0].data.result, 'KO/TKO');
assert.deepEqual(parseSportsEspn(mmaRaw, 'ufc', '999', '202'), []); assert.deepEqual(parseSportsEspn(mmaRaw, 'ufc', '200', '999'), []);
assert.deepEqual(parseSportsEspn({}, 'ufc'), []); assert.deepEqual(parseSportsEspn(nbaRaw, '../../private'), []);
const mma = fights[1].data;
assert.equal(getMatchStatusInfo({ sports: mma, period: '1T', isLive: true } as LiveEvent).category, 'finished');
assert.equal(getMatchStatusInfo({ sports: { ...nba, state: 'break' } } as LiveEvent).icon, 'pause');
assert.equal(getMatchStatusInfo({ sports: { ...nba, state: 'pre' } } as LiveEvent).category, 'today');
const markup = renderToStaticMarkup(<SportsScoreboard data={mma} />);
assert(markup.includes('Peleador C')); assert(markup.includes('Ganador/a')); assert(!markup.includes('0 - 0')); assert(!markup.includes('Minuto')); assert(markup.includes('KO/TKO'));
assert(renderToStaticMarkup(<SportsScoreboard data={nba} />).includes('135'));
for (const image of ['http://example.test/p.png', 'javascript:alert(1)', 'data:text/html,test']) assert.throws(() => sanitizeSportsEvent({ ...nba, competitionLogo: image }));
assert.throws(() => sanitizeSportsEvent({ ...nba, participants: [{ name: '' }, { name: 'B' }] }));
assert.throws(() => sanitizeSportsEvent({ ...nba, source: { competition: 'ufc', eventId: '200', enabled: true } }));
assert.throws(() => sanitizeSportsEvent({ ...nba, participants: [{ name: 'A', score: -1 }, { name: 'B' }] }));
const manual: SportsEvent = { sport: 'other', competition: 'Evento especial', participants: [{ name: 'Participante A' }, { name: 'Participante B' }], state: 'pre' };
assert.equal(sanitizeSportsEvent(manual)!.source, undefined); assert.equal(sanitizeSportsEvent(null), null);
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = (async () => new Response(JSON.stringify(mmaRaw))) as typeof fetch;
  assert.equal((await getSportsLive(fights[0].data.source!))!.participants[0].name, 'Peleadora A');
  assert.equal(await getSportsLive({ ...fights[0].data.source!, boutId: undefined }), null, 'Una cartelera con varias peleas no sustituye la pelea elegida');
  globalThis.fetch = (async () => new Response('{}', { status: 503 })) as typeof fetch;
  assert.equal(await getSportsLive(nba.source!), null);
} finally { globalThis.fetch = originalFetch; }
const source = await readFile(new URL('../serverApp.ts', import.meta.url), 'utf8');
const route = source.slice(source.indexOf("app.get(['/api/sports-api/events'"), source.indexOf("app.get(['/api/football-api/matches'"));
const handler = route.slice(route.indexOf('async (req:'), route.lastIndexOf('\n});') + 2);
const compiled = await transform(`export const handle = ${handler};`, { loader: 'ts', format: 'cjs' });
const module = { exports: {} as any }; const urls: string[] = [];
new Function('module', 'exports', 'SPORTS_COMPETITIONS', 'fetchEspn', compiled.code)(module, module.exports, SPORTS_COMPETITIONS, async (url: string) => { urls.push(url); return new Response(JSON.stringify(nbaRaw)); });
const request = async (query: Record<string, string>, path = '/api/sports-api/events') => {
  let status = 200; let body: any; const res: any = { status: (v: number) => { status = v; return res; }, set: () => res, setHeader: () => {}, json: (v: any) => { body = v; return res; } };
  await module.exports.handle({ query, path }, res); return { status, body };
};
assert.equal((await request({ competition: '../../secret' })).status, 400); assert.equal(urls.length, 0);
assert.equal((await request({ competition: 'nba', date: 'invalid' })).status, 400);
assert.equal((await request({ competition: 'nba' })).status, 200); assert(urls[0].endsWith('/basketball/nba/scoreboard'));
await request({ competition: 'nba', eventId: '100' }, '/api/sports-api/event'); assert(urls.at(-1)!.includes('/summary?event=100'));
await request({ competition: 'ufc', eventId: '200', boutId: '201', date: '2026-10-24' }, '/api/sports-api/event'); assert(urls.at(-1)!.includes('/mma/ufc/scoreboard?dates=20261023-20261025'));
console.log('Multideporte: puntos >50, cuartos/prórroga, rounds, pelea exacta, ganador, estados, imágenes seguras, control manual y rutas ESPN comprobados.');
