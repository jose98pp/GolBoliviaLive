import { ClubCrest } from './ClubCrest';
import React, { useState } from 'react';
import { LiveEvent } from '../types/football';
import { BOLIVIAN_CLUBS } from '../data/bolivianFootballData';
import { useClubs } from '../hooks/useClubs';
import { Play } from 'lucide-react';
import {
  getMatchStatusInfo,
  filterMatchesByCategory,
  getMatchCategoryCounts,
  MatchFilterCategory,
} from '../utils/matchStatus';

export interface LiveEventsShowcaseProps {
  events: LiveEvent[];
  activeEventId: string;
  onSelectEvent: (event: LiveEvent) => void;
}

// Portada de partidos simplificada: una tarjeta por partido con
// estado, equipos, marcador y un único botón. Solo muestra partidos creados.
export const LiveEventsShowcase: React.FC<LiveEventsShowcaseProps> = ({
  events,
  activeEventId,
  onSelectEvent,
}) => {
  const { clubs } = useClubs();
  const [filter, setFilter] = useState<MatchFilterCategory>('all');

  const validEvents = events.filter((e) => e && (e.id || e.title));
  const counts = getMatchCategoryCounts(validEvents);

  // En vivo primero, luego el resto
  const sorted = [...validEvents].sort((a, b) => Number(Boolean(b.isLive)) - Number(Boolean(a.isLive)));
  const matches = filterMatchesByCategory(sorted, filter);

  const tabs: { id: MatchFilterCategory; label: string; count: number }[] = [
    { id: 'all', label: 'Todos', count: counts.all },
    { id: 'live', label: 'En vivo', count: counts.live },
    { id: 'today', label: 'Hoy', count: counts.today },
  ];

  return (
    <section className="my-5 w-full">
      <div className="flex items-center justify-between gap-3 mb-3 px-1">
        <h2 className="text-sm sm:text-base font-black tracking-wider text-white uppercase font-display">
          Partidos
        </h2>
        <div className="flex items-center gap-1.5">
          {tabs.map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-emerald-400 text-black'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                }`}
              >
                {tab.label} <span className="font-mono opacity-70">{tab.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {matches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {matches.map((event, idx) => {
            const selected = event.id === activeEventId;
            const home = clubs[event.homeTeam] || BOLIVIAN_CLUBS[event.homeTeam];
            const away = clubs[event.awayTeam] || BOLIVIAN_CLUBS[event.awayTeam];
            const status = getMatchStatusInfo(event);
            const hasScore = typeof event.homeScore === 'number' && typeof event.awayScore === 'number';

            return (
              <button
                key={event.id || `match-${idx}`}
                type="button"
                onClick={() => onSelectEvent(event)}
                className={`w-full text-left rounded-2xl p-4 liquid-glass-panel transition-all cursor-pointer ${
                  selected
                    ? 'border-2 border-emerald-500/80 ring-1 ring-emerald-500/40'
                    : 'border border-white/10 hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${status.badgeClass}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass} ${status.isPulsing ? 'animate-pulse' : ''}`} />
                    {status.label}
                  </span>
                  {event.tournamentName && (
                    <span className="text-[11px] text-slate-400 truncate">{event.tournamentName}</span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-xl"><ClubCrest club={home} /></span>
                    <span className="text-sm font-bold text-white truncate">{home?.name || event.homeTeam}</span>
                  </div>

                  <div className="px-3 py-1 rounded-lg bg-black/40 border border-slate-700/60 font-mono font-black text-white text-base shrink-0">
                    {hasScore ? `${event.homeScore} - ${event.awayScore}` : 'VS'}
                  </div>

                  <div className="flex-1 min-w-0 flex items-center justify-end gap-2">
                    <span className="text-sm font-bold text-white truncate text-right">{away?.name || event.awayTeam}</span>
                    <span className="text-xl"><ClubCrest club={away} /></span>
                  </div>
                </div>

                <div
                  className={`mt-3 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider ${
                    selected ? 'bg-emerald-400 text-black' : 'bg-white text-black'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  {selected ? 'En reproducción' : 'Ver partido'}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="p-6 text-center rounded-2xl liquid-glass-panel border border-white/10 text-sm text-slate-300">
          {validEvents.length === 0 ? 'Aún no hay partidos creados.' : 'No hay partidos en esta categoría.'}
          {validEvents.length > 0 && (
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="ml-2 text-emerald-400 hover:text-emerald-300 underline font-bold cursor-pointer"
            >
              Ver todos
            </button>
          )}
        </div>
      )}
    </section>
  );
};
