import assert from 'node:assert/strict';
import { parseEspnHighlights, parseEspnStandings } from '../src/utils/espnDetails';
import { espnFootballApi } from '../src/services/espnFootballApi';
import { FOOTBALL_COMPETITIONS } from '../src/data/footballLeagues';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';

const summary = { header: { id: '123', competitions: [{ competitors: [{ homeAway: 'home', team: { id: '10', displayName: 'Equipo A' } }, { homeAway: 'away', team: { id: '20', displayName: 'Equipo B' } }] }] }, keyEvents: [
  { id: 'goal', clock: { displayValue: "45'+2'", value: 2820 }, scoringPlay: true, team: { id: '10' }, text: 'Gol del Equipo A', participants: [{ athlete: { displayName: 'Jugadora A' } }] },
  { id: 'card', clock: { value: 3000 }, yellowCard: true, team: { id: '20' }, text: 'Tarjeta amarilla' },
] };
const highlights = parseEspnHighlights('123', summary);
assert.equal(highlights[0].minute, 47); assert.equal(highlights[0].displayClock, "45'+2'"); assert.equal(highlights[0].teamName, 'Equipo A');
assert.equal(highlights[1].minute, 50, 'El reloj numérico se convierte de segundos a minutos');
assert.equal(highlights[1].type, 'yellow_card');
assert.deepEqual(parseEspnHighlights('123', summary), highlights, 'Las actualizaciones conservan IDs estables');
assert.equal(parseEspnHighlights('123', { keyEvents: [summary.keyEvents[0], summary.keyEvents[0]] }).length, 1);
assert.equal(parseEspnHighlights('123', { commentary: [{ play: { id: 'comment', clock: { displayValue: "60'" } }, text: 'Ocasión de gol' }] })[0].minute, 60);
assert.deepEqual(parseEspnHighlights('123', {}), []);
assert.equal(parseEspnHighlights('123', { keyEvents: [{ type: { text: 'Goal Kick' }, text: 'Saque de puerta' }] })[0].type, 'commentary');
const standings = { children: [{ name: 'Grupo A', standings: { entries: [{ team: { id: '10', displayName: 'Equipo A' }, stats: [{ name: 'rank', value: 1 }, { name: 'gamesPlayed', value: 2 }, { name: 'points', value: 0 }] }] } }, { name: 'Grupo B', standings: { entries: [{ team: { id: '20', displayName: 'Equipo B' }, stats: [{ name: 'points', value: 6 }] }] } }] };
const groups = parseEspnStandings(standings);
assert.equal(groups.length, 2); assert.equal(groups[0].name, 'Grupo A'); assert.equal(groups[0].rows[0].points, 0); assert.equal(groups[0].rows[0].lost, null, 'Un dato ausente no se inventa como cero');
assert.deepEqual(parseEspnStandings({ children: [] }), []);
const saved = globalThis.fetch;
try {
  globalThis.fetch = (async () => new Response(JSON.stringify(summary))) as typeof fetch;
  const details = await espnFootballApi.getMatchDetails('123', 'fifa.wwc');
  assert.equal(details?.events?.[0].minute, 47); assert.equal(details?.stats, undefined);
  assert.equal(await espnFootballApi.getMatchDetails('999', 'fifa.wwc'), null, 'No acepta un resumen de otro partido');
  globalThis.fetch = (async () => new Response(JSON.stringify({ ...summary, boxscore: { teams: [{ team: { id: '10' }, statistics: [{ name: 'passes', displayValue: '0' }] }, { team: { id: '20' }, statistics: [{ name: 'passes', displayValue: '100' }] }] } }))) as typeof fetch;
  assert.deepEqual((await espnFootballApi.getMatchDetails('123', 'fifa.wwc'))?.stats?.passes, [0, 100], 'No inventa 300 pases cuando el valor es cero');
  let requested = '';
  globalThis.fetch = (async (url) => { requested = String(url); return new Response(JSON.stringify(standings)); }) as typeof fetch;
  assert.equal((await espnFootballApi.getStandings('ksa.1')).length, 2); assert.equal(requested, '/api/football-api/standings?league=ksa.1');
} finally { globalThis.fetch = saved; }
const server = await readFile(new URL('../serverApp.ts', import.meta.url), 'utf8');
const route = server.slice(server.indexOf("app.get('/api/football-api/standings'"), server.indexOf("app.get(['/api/football-api/matches'"));
const handler = route.slice(route.indexOf('async (req:'), route.lastIndexOf(');')).replace(/\);\s*$/, '').trim();
const compiled = await transform(`export const handler = ${handler};`, { loader: 'ts', format: 'cjs' });
const module = { exports: {} as any }; const urls: string[] = [];
new Function('module', 'exports', 'FOOTBALL_COMPETITIONS', 'fetchEspn', compiled.code)(module, module.exports, FOOTBALL_COMPETITIONS, async (url: string) => { urls.push(url); return new Response(JSON.stringify(standings)); });
async function request(league: string) { let status = 200; let data: any; const res: any = { status(code: number) { status = code; return res; }, set() { return res; }, json(value: any) { data = value; return res; } }; await module.exports.handler({ query: { league } }, res); return { status, data }; }
assert.equal((await request('fifa.wwc')).status, 200);
assert.equal(urls[0], 'https://site.api.espn.com/apis/v2/sports/soccer/fifa.wwc/standings');
assert.equal((await request('https://evil.example')).status, 400); assert.equal(urls.length, 1);
console.log('ESPN: destacados reales, minutos, equipos, IDs estables, resumen exacto, grupos de tabla, datos ausentes y competición validada comprobados.');
