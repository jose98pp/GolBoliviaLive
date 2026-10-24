import type { SportsEvent, EventParticipant, EventSport, EventState } from '../types/sports';
import type { Club, LiveEvent } from '../types/football';

export const SPORTS_COMPETITIONS: Record<string, { name: string; sport: EventSport; path: string }> = {
  nba: { name: 'NBA', sport: 'basketball', path: 'basketball/nba' },
  wnba: { name: 'WNBA', sport: 'basketball', path: 'basketball/wnba' },
  'mens-college-basketball': { name: 'NCAA masculino', sport: 'basketball', path: 'basketball/mens-college-basketball' },
  'womens-college-basketball': { name: 'NCAA femenino', sport: 'basketball', path: 'basketball/womens-college-basketball' },
  ufc: { name: 'UFC', sport: 'mma', path: 'mma/ufc' },
};
export const SPORTS_STATE_LABELS: Record<EventState, string> = { pre: 'Previa', live: 'En vivo', break: 'Descanso', final: 'Finalizado', postponed: 'Aplazado', cancelled: 'Cancelado' };
export function sportsImage(value: unknown): string {
  if (typeof value !== 'string' || value.length > 1500) return '';
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}
const text = (value: unknown, max = 120) => typeof value === 'string' ? value.trim().slice(0, max) : '';
export function sanitizeSportsEvent(value: any): SportsEvent | null {
  if (value == null) return null;
  if (!['basketball', 'mma', 'other'].includes(value.sport) || !Object.hasOwn(SPORTS_STATE_LABELS, value.state) || !Array.isArray(value.participants) || value.participants.length !== 2 || !text(value.competition)) throw new Error('Completa el deporte, la competición y los dos participantes.');
  const participants = value.participants.map((p: any) => {
    if (!p || !text(p.name)) throw new Error('Escribe el nombre de ambos participantes.');
    if (p.imageUrl && !sportsImage(p.imageUrl)) throw new Error('Las imágenes de participantes deben usar enlaces HTTPS.');
    if (p.score !== undefined && (!Number.isInteger(p.score) || p.score < 0 || p.score > 1000)) throw new Error('El resultado debe ser un entero entre 0 y 1000.');
    return { name: text(p.name), imageUrl: sportsImage(p.imageUrl), ...(p.score !== undefined && value.sport !== 'mma' ? { score: p.score } : {}), ...(typeof p.winner === 'boolean' ? { winner: p.winner } : {}) };
  }) as SportsEvent['participants'];
  if (value.competitionLogo && !sportsImage(value.competitionLogo)) throw new Error('El logo de competición debe usar HTTPS.');
  let source: SportsEvent['source'];
  if (value.source) {
    const entry = SPORTS_COMPETITIONS[value.source.competition];
    if (!Object.hasOwn(SPORTS_COMPETITIONS, value.source.competition) || entry.sport !== value.sport || !/^\d{1,20}$/.test(value.source.eventId) || (value.source.boutId && !/^\d{1,20}$/.test(value.source.boutId)) || typeof value.source.enabled !== 'boolean') throw new Error('El vínculo deportivo con ESPN no es válido.');
    source = { competition: value.source.competition, eventId: String(value.source.eventId), ...(value.source.boutId ? { boutId: String(value.source.boutId) } : {}), ...(typeof value.source.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.source.date) ? { date: value.source.date } : {}), enabled: value.source.enabled };
  }
  return { sport: value.sport, competition: text(value.competition), competitionLogo: sportsImage(value.competitionLogo), participants, state: value.state, phase: text(value.phase, 80), clock: text(value.clock, 40), result: text(value.result, 240), ...(source ? { source } : {}) };
}
export function sportsParticipantClub(event: LiveEvent | null | undefined, side: number): Club | null {
  const participant = event?.sports?.participants[side];
  return participant ? { id: `${event!.id}_${side}`, name: participant.name, shortName: participant.name, logoUrl: participant.imageUrl, city: '', stadium: '', altitudeMeters: 0, primaryColor: '#334155', secondaryColor: '#ffffff', textColor: '#ffffff', badgeEmoji: '' } : null;
}
export interface SportsImport { id: string; title: string; date: string; data: SportsEvent }
export function parseSportsEspn(raw: any, competitionKey: string, eventId?: string, boutId?: string): SportsImport[] {
  const definition = SPORTS_COMPETITIONS[competitionKey];
  if (!definition || !Object.hasOwn(SPORTS_COMPETITIONS, competitionKey)) return [];
  const events = raw?.header ? [raw.header] : raw?.events || [];
  return events.filter((e: any) => !eventId || String(e.id) === eventId).flatMap((event: any) => (event.competitions || []).filter((c: any) => !boutId || String(c.id) === boutId).flatMap((c: any) => {
    if (definition.sport === 'mma' && !/^\d{1,20}$/.test(String(c.id))) return [];
    const competitors = c.competitors || [];
    if (competitors.length !== 2) return [];
    const status = c.status || event.status;
    if (!status?.type) return [];
    const name = String(status.type.name || '').toUpperCase();
    const state: EventState = /CANCEL/.test(name) ? 'cancelled' : /POSTPON|DELAY/.test(name) ? 'postponed' : status.type.completed || status.type.state === 'post' ? 'final' : /HALFTIME|END_PERIOD|INTERMISSION|BREAK/.test(name) ? 'break' : status.type.state === 'in' ? 'live' : 'pre';
    const ordered = definition.sport === 'basketball' ? [...competitors].sort((a: any, b: any) => Number(b.homeAway === 'home') - Number(a.homeAway === 'home')) : competitors;
    const participants = ordered.map((p: any): EventParticipant => {
      const identity = p.athlete || p.team || {};
      const score = Number(typeof p.score === 'object' ? p.score?.value ?? p.score?.displayValue : p.score);
      return { name: identity.displayName || identity.fullName || identity.name || 'Por confirmar', imageUrl: sportsImage(identity.headshot?.href || identity.headshot || identity.logo || identity.logos?.[0]?.href), ...(definition.sport === 'basketball' && Number.isFinite(score) && score >= 0 ? { score } : {}), ...(typeof p.winner === 'boolean' ? { winner: p.winner } : {}) };
    }) as SportsEvent['participants'];
    const round = Number(status.period) || 0;
    const phase = round ? definition.sport === 'mma' ? `Round ${round}` : round <= (competitionKey.includes('college') && competitionKey.startsWith('mens') ? 2 : 4) ? `${round}${competitionKey === 'mens-college-basketball' ? 'ª mitad' : 'º cuarto'}` : 'Prórroga' : '';
    const data: SportsEvent = { sport: definition.sport, competition: definition.sport === 'mma' ? String(event.name || definition.name).slice(0, 120) : definition.name, competitionLogo: sportsImage(raw.leagues?.[0]?.logos?.[0]?.href || raw.header?.league?.logos?.[0]?.href), participants, state, phase, clock: String(status.displayClock || ''), result: state === 'final' ? String(c.details?.text || status.type.shortDetail || status.type.detail || status.type.description || '') : '', source: { competition: competitionKey, eventId: String(event.id), ...(event.date ? { date: String(event.date).slice(0, 10) } : {}), ...(definition.sport === 'mma' ? { boutId: String(c.id) } : {}), enabled: true }, syncedAt: Date.now() };
    return [{ id: `${event.id}:${c.id}`, title: `${participants[0].name} vs ${participants[1].name}`, date: c.date || event.date || '', data }];
  }));
}
