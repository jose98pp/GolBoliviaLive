import type { Club } from '../types/football';
import { findClubCrest, getClubCrestUrl, getClubLeague, normalizeCrestUrl } from '../utils/clubCrests';

type CrestTeam = { names: string[]; logoUrl: string };
const requests = new Map<string, Promise<CrestTeam[]>>();
function getLeagueCrests(league: string): Promise<CrestTeam[]> {
  if (!requests.has(league)) requests.set(league, (async () => {
    try {
      const response = await fetch(`/api/football-api/teams?league=${encodeURIComponent(league)}`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data.teams) ? data.teams.filter((team: CrestTeam) => Array.isArray(team.names) && team.names.every(name => typeof name === 'string') && normalizeCrestUrl(team.logoUrl)) : [];
    } catch { return []; }
  })());
  return requests.get(league)!;
}
export async function resolveClubCrests(clubs: Club[]): Promise<Record<string, string>> {
  const missing = clubs.filter(club => !getClubCrestUrl(club) && getClubLeague(club));
  const leagues = [...new Set(missing.map(getClubLeague))];
  const teams = new Map(await Promise.all(leagues.map(async league => [league, await getLeagueCrests(league)] as const)));
  const result: Record<string, string> = {};
  for (const club of missing) {
    const url = findClubCrest(club, teams.get(getClubLeague(club)) || []);
    if (url) result[club.id] = url;
  }
  return result;
}
