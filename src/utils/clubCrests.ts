import type { Club } from '../types/football';

const localCrests = new Set(["real_madrid", "barcelona", "atletico_madrid", "athletic_club", "sevilla", "real_betis", "real_sociedad", "villarreal", "valencia", "man_city", "arsenal", "liverpool", "man_united", "chelsea", "tottenham", "aston_villa", "newcastle", "girona"]);
export function normalizeCrestUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > 1500) return '';
  const source = value.trim();
  if (/^\/crests\/[a-z0-9_-]+\.png$/.test(source)) return source;
  try { const url = new URL(source); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; }
  catch { return ''; }
}
export function getClubCrestUrl(club?: Partial<Club>): string {
  return normalizeCrestUrl(club?.logoUrl) || (club?.id && localCrests.has(club.id) ? `/crests/${club.id}.png` : '');
}
export function normalizeClubName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\b(club|deportivo|de|futbol|football|fc|cf|ca|afc|cd)\b/g, '').replace(/[^a-z0-9]/g, '');
}
export function getClubLeague(club: Partial<Club>): string {
  const codes: Record<string, string> = { BO: 'bol.1', ES: 'esp.1', GB: 'eng.1', ENG: 'eng.1', AR: 'arg.1', BR: 'bra.1', CO: 'col.1', PE: 'per.1', CL: 'chi.1', UY: 'uru.1' };
  if (codes[club.country?.toUpperCase() || '']) return codes[club.country!.toUpperCase()];
  const source = [club.country, club.league].filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/bolivia/.test(source)) return 'bol.1';
  if (/espana|spain|laliga/.test(source)) return 'esp.1';
  if (/inglaterra|england|premier/.test(source)) return 'eng.1';
  if (/argentina/.test(source)) return 'arg.1';
  if (/brasil|brazil/.test(source)) return 'bra.1';
  if (/colombia/.test(source)) return 'col.1';
  if (/peru/.test(source)) return 'per.1';
  if (/chile/.test(source)) return 'chi.1';
  if (/uruguay/.test(source)) return 'uru.1';
  return '';
}
const aliases: Record<string, string[]> = { wilstermann: ['Jorge Wilstermann'], oriente: ['Oriente Petrolero'], always: ['Always Ready'], nacional: ['Nacional Potosí'],
  san_antonio: ['San Antonio Bulo Bulo', 'San Antonio'], gv_san_jose: ['GV San José', 'Gualberto Villarroel San José'], u_vinto: ['Universitario de Vinto'], guabira: ['Guabirá'] };
export function findClubCrest(club: Club, teams: { names: string[]; logoUrl: string }[]): string {
  const names = [club.name, club.shortName, ...(aliases[club.id] || [])].filter(Boolean).map(normalizeClubName);
  return teams.find(team => team.names.some(name => names.includes(normalizeClubName(name))))?.logoUrl || '';
}
