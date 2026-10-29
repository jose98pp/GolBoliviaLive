import type { Club } from '../types/football';

export const FOOTBALL_LEAGUES: Record<string, string> = {
  'ksa.1': 'Arabia Saudita (Saudi Pro League)',
  'mex.1': 'México (Liga MX)', 'mex.2': 'México (Liga de Expansión MX)',
  'usa.1': 'Estados Unidos (MLS)', 'usa.usl.1': 'Estados Unidos (USL Championship)',
  'arg.2': 'Argentina (Primera Nacional)', 'bra.2': 'Brasil (Série B)',
  'bol.1': 'Bolivia (División Profesional)', 'arg.1': 'Argentina (Liga Profesional)', 'bra.1': 'Brasil (Brasileirão Série A)',
  'esp.1': 'España (LaLiga EA Sports)', 'eng.1': 'Inglaterra (Premier League)', 'ita.1': 'Italia (Serie A)', 'ger.1': 'Alemania (Bundesliga)', 'fra.1': 'Francia (Ligue 1)',
  'por.1': 'Portugal (Primeira Liga)', 'ned.1': 'Países Bajos (Eredivisie)', 'col.1': 'Colombia (Primera A)', 'chi.1': 'Chile (Primera División)', 'per.1': 'Perú (Liga 1)', 'uru.1': 'Uruguay (Primera División)', 'par.1': 'Paraguay (Primera División)', 'ecu.1': 'Ecuador (LigaPro)',
  'uefa.champions': 'UEFA Champions League', 'uefa.europa': 'UEFA Europa League', 'conmebol.libertadores': 'Copa CONMEBOL Libertadores', 'conmebol.sudamericana': 'Copa CONMEBOL Sudamericana',
};
export const FOOTBALL_CUPS: Record<string, string> = {
  'mex.copa_mx': 'México (Copa MX)',
  'usa.open': 'Estados Unidos (U.S. Open Cup)',
  'arg.copa_arg': 'Argentina (Copa Argentina)',
  'arg.copa_lpf': 'Argentina (Copa de la Liga Profesional)',
  'bra.copa_do_brazil': 'Brasil (Copa do Brasil)',
  'esp.copa_del_rey': 'España (Copa del Rey)',
  'eng.fa': 'Inglaterra (FA Cup)',
  'eng.league_cup': 'Inglaterra (Copa de la Liga / EFL Cup)',
  'ita.coppa_italia': 'Italia (Coppa Italia)',
  'ger.dfb_pokal': 'Alemania (DFB-Pokal)',
  'fra.coupe_de_france': 'Francia (Copa de Francia)',
  'por.taca.portugal': 'Portugal (Taça de Portugal)',
  'ned.cup': 'Países Bajos (KNVB Beker)',
  'col.copa': 'Colombia (Copa Colombia)',
  'chi.copa_chi': 'Chile (Copa Chile)',
};
export const FOOTBALL_REGIONAL: Record<string, string> = {
  'afc.champions': 'Asia (AFC Champions League Elite)',
  'concacaf.champions': 'CONCACAF Champions Cup',
  'concacaf.leagues.cup': 'Leagues Cup (MLS / Liga MX)',
  'concacaf.gold': 'CONCACAF Copa Oro',
  'conmebol.america': 'CONMEBOL Copa América',
  'fifa.world': 'FIFA Copa Mundial masculina',
};
export const FOOTBALL_WOMENS: Record<string, string> = {
  'mex.women': 'México (Liga MX Femenil)',
  'usa.nwsl': 'Estados Unidos (NWSL femenina)',
  'eng.w.1': 'Inglaterra (Women’s Super League femenina)',
  'esp.w.1': 'España (Liga F femenina)',
  'fifa.world_u17_womens': 'FIFA Mundial femenino Sub-17',
  'fifa.world_u20_womens': 'FIFA Mundial femenino Sub-20',
  'fifa.wwc': 'FIFA Copa Mundial femenina',
  'conmebol.america_femenina': 'CONMEBOL Copa América Femenina',
  'conmebol.libertadores_femenina': 'CONMEBOL Libertadores Femenina',
};
export const FOOTBALL_YOUTH: Record<string, string> = {
  'fifa.world_u20': 'FIFA Mundial Sub-20 masculino',
  'fifa.world_u17': 'FIFA Mundial Sub-17 masculino',
  'conmebol.sudamericano.sub20': 'CONMEBOL Sudamericano Sub-20 masculino',
  'conmebol.sudamericano.sub17': 'CONMEBOL Sudamericano Sub-17 masculino',
};
export const FOOTBALL_COMPETITIONS: Record<string, string> = { ...FOOTBALL_LEAGUES, ...FOOTBALL_CUPS, ...FOOTBALL_REGIONAL, ...FOOTBALL_WOMENS, ...FOOTBALL_YOUTH };

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
export const clubNameKey = normalize;
const definitions: [string, string][] = [
  ['arg.1', 'boca_juniors:Boca Juniors|river_plate:River Plate|racing:Racing Club|independiente:Independiente|san_lorenzo:San Lorenzo|estudiantes:Estudiantes de La Plata|gimnasia:Gimnasia La Plata|velez:Vélez Sarsfield|huracan:Huracán|argentinos:Argentinos Juniors|lanus:Lanús|banfield:Banfield|defensa:Defensa y Justicia|tigre:Tigre|platense:Platense|barracas:Barracas Central|riestra:Deportivo Riestra|central_cordoba:Central Córdoba|talleres:Talleres de Córdoba|belgrano:Belgrano|instituto:Instituto|rosario_central:Rosario Central|newells:Newell’s Old Boys|union:Unión de Santa Fe|colon:Colón de Santa Fe|godoy_cruz:Godoy Cruz|ind_rivadavia:Independiente Rivadavia|san_martin_sj:San Martín San Juan|aldosivi:Aldosivi|sarmiento:Sarmiento|atletico_tucuman:Atlético Tucumán|gimnasia_mendoza:Gimnasia Mendoza|estudiantes_rc:Estudiantes Río Cuarto'],
  ['bra.1', 'flamengo:Flamengo|palmeiras:Palmeiras|corinthians:Corinthians|sao_paulo:São Paulo|santos:Santos|fluminense:Fluminense|botafogo:Botafogo|vasco:Vasco da Gama|gremio:Grêmio|internacional:Internacional|cruzeiro:Cruzeiro|atletico_mg:Atlético Mineiro|athletico_pr:Athletico Paranaense|bahia:Bahia|vitoria:Vitória|fortaleza:Fortaleza|ceara:Ceará|sport:Sport Recife|juventude:Juventude|mirassol:Mirassol|bragantino:Red Bull Bragantino|coritiba:Coritiba|goias:Goiás|chapecoense:Chapecoense|remo:Remo'],
  ['ita.1','inter:Internazionale|milan:AC Milan|juventus:Juventus|napoli:Napoli|roma:AS Roma|lazio:Lazio|atalanta:Atalanta|bologna:Bologna|fiorentina:Fiorentina'],
  ['ger.1','bayern:Bayern Munich|dortmund:Borussia Dortmund|leverkusen:Bayer Leverkusen|leipzig:RB Leipzig|frankfurt:Eintracht Frankfurt|stuttgart:VfB Stuttgart'],
  ['fra.1','psg:Paris Saint-Germain|monaco:AS Monaco|marseille:Marseille|lille:Lille|lyon:Lyon|brest:Brest'],
  ['por.1','benfica:Benfica|porto:FC Porto|sporting:Sporting CP|braga:Braga'], ['ned.1','ajax:Ajax|psv:PSV Eindhoven|feyenoord:Feyenoord'],
  ['uru.1','penarol:Peñarol|nacional_uru:Nacional|liverpool_uru:Liverpool Montevideo'], ['par.1','olimpia:Olimpia|cerro_porteno:Cerro Porteño|libertad:Libertad'],
  ['ecu.1','ldu:Liga de Quito|ind_valle:Independiente del Valle|barcelona_ec:Barcelona SC|emelec:Emelec'], ['col.1','atl_nacional:Atlético Nacional|millonarios:Millonarios|america_cali:América de Cali|junior:Junior|santa_fe:Independiente Santa Fe'],
  ['chi.1','colo_colo:Colo-Colo|u_chile:Universidad de Chile|u_catolica:Universidad Católica'], ['per.1','alianza:Alianza Lima|universitario:Universitario|cristal:Sporting Cristal'],
];
export const ADDITIONAL_CLUBS: Record<string, Club> = Object.fromEntries(definitions.flatMap(([league, entries]) => entries.split('|').map(entry => {
  const [id, name] = entry.split(':');
  return [id, { id, name, shortName: name, league: FOOTBALL_LEAGUES[league], country: FOOTBALL_LEAGUES[league].split(' (')[0], city: '', stadium: '', altitudeMeters: 0, primaryColor: '#334155', secondaryColor: '#ffffff', textColor: '#ffffff', badgeEmoji: '' }];
})));
for (const id of ['colon', 'godoy_cruz', 'san_martin_sj']) ADDITIONAL_CLUBS[id].league = FOOTBALL_LEAGUES['arg.2'];
for (const id of ['fortaleza', 'ceara', 'sport', 'juventude', 'goias']) ADDITIONAL_CLUBS[id].league = FOOTBALL_LEAGUES['bra.2'];
const originalLeagueIds: Record<string, string[]> = {
  'esp.1': ['real_madrid', 'barcelona', 'atletico_madrid', 'athletic_club', 'sevilla', 'real_betis', 'real_sociedad', 'villarreal', 'valencia', 'girona'],
  'eng.1': ['man_city', 'arsenal', 'liverpool', 'man_united', 'chelsea', 'tottenham', 'aston_villa', 'newcastle'],
};
export function clubLeague(club: Club): string {
  if (club.league && Object.values({ ...FOOTBALL_WOMENS, ...FOOTBALL_YOUTH }).some(label => club.league === label || club.league === `Internacionales · ${label}`)) return club.league;
  const original = Object.entries(originalLeagueIds).find(([, ids]) => ids.includes(club.id));
  if (original) return FOOTBALL_LEAGUES[original[0]];
  const known = ADDITIONAL_CLUBS[club.id] || Object.values(ADDITIONAL_CLUBS).find(c => normalize(c.name) === normalize(club.name));
  if (club.league && Object.values(FOOTBALL_LEAGUES).includes(club.league) && club.league.split(' (')[0] === known?.country) return club.league;
  if (known) return known.league!;
  if (club.league && Object.values(FOOTBALL_LEAGUES).includes(club.league)) return club.league;
  if (club.league?.endsWith(' (Otros equipos)')) return club.league;
  const country = normalize(club.country || '');
  const match = Object.entries(FOOTBALL_LEAGUES).find(([id, label]) => id.endsWith('.1') && normalize(label.split(' (')[0]) === country)?.[1];
  if (match) return match;
  return club.league || (club.country ? `${club.country} (Otros equipos)` : 'Otros equipos internacionales');
}
