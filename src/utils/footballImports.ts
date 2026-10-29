import type { Club } from '../types/football';
import { FOOTBALL_COMPETITIONS, clubNameKey } from '../data/footballLeagues';

export function footballCategory(value: string): string {
  const text = `${value} ${FOOTBALL_COMPETITIONS[value] || ''}`.toLowerCase();
  const sex = /femen|women|nwsl|\.wwc/.test(text) ? 'w' : 'm';
  const age = text.match(/(?:sub[- ._]?|world_u)(17|20)/)?.[1] || '';
  return sex + age;
}

export function footballImportClubId(teamId: string, competition: string): string {
  const category = footballCategory(competition);
  return category === 'm' ? `espn_${teamId}` : `espn_${category}_${teamId}`;
}

export function findFootballImportClub(clubs: Record<string, Club>, teamId: string | undefined, names: string[], competition: string): Club | undefined {
  const category = footballCategory(competition);
  const candidates = Object.values(clubs).filter(club => footballCategory(club.league || '') === category);
  const exact = teamId && candidates.find(club => club.id === footballImportClubId(teamId, competition) || club.id === `espn_${teamId}`);
  return exact || candidates.find(club => names.some(name => name && (clubNameKey(name) === clubNameKey(club.name) || clubNameKey(name) === clubNameKey(club.shortName))));
}
