import type { LiveEvent } from '../types/football';

export function parseEspnMatch(event: any): Partial<LiveEvent> | null {
  const competition = event?.competitions?.[0];
  const status = competition?.status || event?.status;
  const teams = competition?.competitors;
  if (!status?.type || !Array.isArray(teams)) return null;
  const home = teams.find((c: any) => c.homeAway === 'home');
  const away = teams.find((c: any) => c.homeAway === 'away');
  if (!home || !away) return null;
  const type = status.type;
  const name = String(type.name || '').toUpperCase();
  const finished = Boolean(type.completed || type.state === 'post');
  const live = !finished && type.state === 'in';
  const halftime = /HALFTIME|HALF_TIME|INTERMISSION/.test(name);
  const rawClock = String(status.displayClock || '');
  const parts = rawClock.match(/^(\d+)(?:['’′])?(?:\s*\+\s*(\d+))?/);
  const minute = parts ? Number(parts[1]) + Number(parts[2] || 0) : Math.floor(Math.max(0, Number(status.clock) || 0) / 60);
  const period: LiveEvent['period'] = finished ? 'Finalizado' : halftime ? 'Descanso' : Number(status.period) > 2 ? 'Tiempo Extra' : Number(status.period) === 2 ? '2T' : '1T';
  const score = (c: any) => Math.max(0, parseInt(typeof c.score === 'object' ? c.score?.displayValue ?? c.score?.value : c.score, 10) || 0);
  return { homeScore: score(home), awayScore: score(away), matchMinute: minute, period, isLive: live,
    isClockRunning: live && !halftime, broadcastMode: finished ? 'post_match' : halftime ? 'halftime' : live ? 'obs_custom' : 'pre_match',
    displayClock: rawClock, statusText: finished ? 'Finalizado' : halftime ? 'Entretiempo' : live ? 'En vivo' : String(type.description || 'Previa'), espnUpdatedAt: Date.now() };
}
