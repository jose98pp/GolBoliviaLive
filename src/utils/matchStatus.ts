import { LiveEvent } from '../types/football';

export type MatchFilterCategory = 'all' | 'live' | 'today' | 'finished';

export interface MatchStatusInfo {
  category: 'live' | 'today' | 'finished';
  label: string;
  shortLabel: string;
  badgeClass: string;
  dotClass: string;
  isPulsing: boolean;
  icon: 'live' | 'pause' | 'var' | 'finish' | 'clock';
}

/**
 * Derives authoritative status, badges and category for a LiveEvent
 * matching the master dashboard states:
 * - Medio tiempo / Descanso (Entretiempo)
 * - Finalizado (Terminado con resultado final)
 * - Revisión VAR (Revisión arbitral en curso)
 * - 1T / 2T / Tiempo Extra (En juego directo)
 * - Previa / Hoy (Programado para hoy por iniciar)
 */
export function getMatchStatusInfo(event?: LiveEvent | null): MatchStatusInfo {
  if (!event) {
    return {
      category: 'today',
      label: 'PROGRAMADO',
      shortLabel: 'HOY',
      badgeClass: 'bg-slate-800/90 text-slate-300 border-slate-700',
      dotClass: 'bg-slate-400',
      isPulsing: false,
      icon: 'clock',
    };
  }

  const rawPeriod = (event.period || '1T').trim();
  const rawMode = (event.broadcastMode || '').trim().toLowerCase();

  // 1. Revisión VAR
  if (
    rawMode === 'var' ||
    rawPeriod === 'Revisión VAR' ||
    rawPeriod === 'VAR' ||
    rawPeriod.toLowerCase().includes('var')
  ) {
    return {
      category: 'live',
      label: 'REVISIÓN VAR',
      shortLabel: 'VAR',
      badgeClass: 'bg-purple-500/25 text-purple-300 border-purple-500/50 shadow-purple-900/30',
      dotClass: 'bg-purple-400',
      isPulsing: true,
      icon: 'var',
    };
  }

  // 2. Finalizado
  if (
    rawPeriod === 'Finalizado' ||
    rawMode === 'post_match' ||
    rawPeriod.toLowerCase().includes('finalizado') ||
    rawPeriod.toLowerCase().includes('terminado')
  ) {
    return {
      category: 'finished',
      label: 'FINALIZADO',
      shortLabel: 'FINAL',
      badgeClass: 'bg-slate-850 text-slate-400 border-slate-750',
      dotClass: 'bg-slate-500',
      isPulsing: false,
      icon: 'finish',
    };
  }

  // 3. Medio tiempo / Descanso / Entretiempo
  if (
    rawPeriod === 'Descanso' ||
    rawMode === 'halftime' ||
    rawPeriod.toLowerCase().includes('descanso') ||
    rawPeriod.toLowerCase().includes('medio tiempo')
  ) {
    return {
      category: 'live',
      label: 'ENTRETIEMPO',
      shortLabel: 'DESCANSO',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-950/30',
      dotClass: 'bg-amber-400',
      isPulsing: false,
      icon: 'pause',
    };
  }

  // 4. Previa / Programado Hoy
  if (
    rawMode === 'pre_match' ||
    event.isLive === false ||
    rawPeriod.toLowerCase().includes('previa') ||
    rawPeriod.toLowerCase().includes('programado') ||
    (event.matchMinute === 0 && !event.isClockRunning && (event.homeScore ?? 0) === 0 && (event.awayScore ?? 0) === 0 && rawPeriod === '1T' && event.broadcastMode === 'simulation')
  ) {
    return {
      category: 'today',
      label: 'PREVIA / HOY',
      shortLabel: 'HOY',
      badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      dotClass: 'bg-sky-400',
      isPulsing: true,
      icon: 'clock',
    };
  }

  // 5. En Vivo (1T, 2T, Tiempo Extra)
  const clock = event.displayClock || (event.matchMinute !== undefined && event.matchMinute > 0 ? `${event.matchMinute}'` : '');
  const minuteText = clock ? ` · ${clock}` : '';
  return {
    category: 'live',
    label: `EN VIVO (${rawPeriod}${minuteText})`,
    shortLabel: `${rawPeriod}${minuteText}`,
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-950/30',
    dotClass: 'bg-emerald-400',
    isPulsing: true,
    icon: 'live',
  };
}

/**
 * Filters a list of events by match category
 */
export function filterMatchesByCategory(
  events: LiveEvent[],
  category: MatchFilterCategory
): LiveEvent[] {
  if (category === 'all') return events;
  return events.filter((e) => {
    const info = getMatchStatusInfo(e);
    return info.category === category;
  });
}

/**
 * Calculates counts of matches per category
 */
export function getMatchCategoryCounts(events: LiveEvent[]): Record<MatchFilterCategory, number> {
  const counts: Record<MatchFilterCategory, number> = {
    all: events.length,
    live: 0,
    today: 0,
    finished: 0,
  };

  for (const e of events) {
    const info = getMatchStatusInfo(e);
    counts[info.category]++;
  }

  return counts;
}
