import { parseSportsEspn } from '../utils/sportsEvents';
import type { SportsEvent } from '../types/sports';

export async function getSportsEvents(competition: string, date = '') {
  const response = await fetch(`/api/sports-api/events?competition=${encodeURIComponent(competition)}${date ? `&date=${encodeURIComponent(date)}` : ''}`, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('ESPN no está disponible para esta competición. Puedes completar el evento manualmente.');
  return parseSportsEspn(await response.json(), competition);
}
export async function getSportsLive(source: NonNullable<SportsEvent['source']>): Promise<SportsEvent | null> {
  try {
    const response = await fetch(`/api/sports-api/event?competition=${encodeURIComponent(source.competition)}&eventId=${encodeURIComponent(source.eventId)}${source.boutId ? `&boutId=${encodeURIComponent(source.boutId)}` : ''}${source.date ? `&date=${encodeURIComponent(source.date)}` : ''}`, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) return null;
    const matches = parseSportsEspn(await response.json(), source.competition, source.eventId, source.boutId);
    return matches.length === 1 ? matches[0].data : null;
  } catch { return null; }
}
