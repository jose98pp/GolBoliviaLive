import type { Club } from '../types/football';

export const FOOTBALL_LEAGUES: Record<string, string> = {
  'arg.2': 'Argentina (Primera Nacional)', 'bra.2': 'Brasil (Série B)',
  'bol.1': 'Bolivia (División Profesional)', 'arg.1': 'Argentina (Liga Profesional)', 'bra.1': 'Brasil (Brasileirão Série A)',
  'esp.1': 'España (LaLiga EA Sports)', 'eng.1': 'Inglaterra (Premier League)', 'ita.1': 'Italia (Serie A)', 'ger.1': 'Alemania (Bundesliga)', 'fra.1': 'Francia (Ligue 1)',
  'por.1': 'Portugal (Primeira Liga)', 'ned.1': 'Países Bajos (Eredivisie)', 'col.1': 'Colombia (Primera A)', 'chi.1': 'Chile (Primera División)', 'per.1': 'Perú (Liga 1)', 'uru.1': 'Uruguay (Primera División)', 'par.1': 'Paraguay (Primera División)', 'ecu.1': 'Ecuador (LigaPro)',
  'uefa.champions': 'UEFA Champions League', 'uefa.europa': 'UEFA Europa League', 'conmebol.libertadores': 'Copa CONMEBOL Libertadores', 'conmebol.sudamericana': 'Copa CONMEBOL Sudamericana',
};
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
  const original = Object.entries(originalLeagueIds).find(([, ids]) => ids.includes(club.id));
  if (original) return FOOTBALL_LEAGUES[original[0]];
  const known = ADDITIONAL_CLUBS[club.id] || Object.values(ADDITIONAL_CLUBS).find(c => normalize(c.name) === normalize(club.name));
  if (club.league && Object.values(FOOTBALL_LEAGUES).includes(club.league) && club.league.split(' (')[0] === known?.country) return club.league;
  if (known) return known.league!;
  if (club.league && Object.values(FOOTBALL_LEAGUES).includes(club.league)) return club.league;
  const country = normalize(club.country || '');
  const match = Object.entries(FOOTBALL_LEAGUES).find(([id, label]) => id.endsWith('.1') && normalize(label.split(' (')[0]) === country)?.[1];
  if (match) return match;
  return club.league || (club.country ? `${club.country} (Otros equipos)` : 'Otros equipos internacionales');
}
