import React, { useState } from 'react';
import { LiveEvent } from '../types/football';
import { BOLIVIAN_CLUBS } from '../data/bolivianFootballData';
import { useClubs } from '../hooks/useClubs';
import { Zap, Tv, Radio, Play, ChevronRight, Activity, Flame, Shield } from 'lucide-react';
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

export const LiveEventsShowcase: React.FC<LiveEventsShowcaseProps> = ({
  events,
  activeEventId,
  onSelectEvent,
}) => {
  const { clubs } = useClubs();
  const [filterCategory, setFilterCategory] = useState<MatchFilterCategory>('all');

  // Estilo Fútbol Libre: Mostrar todos los partidos configurados con su estado
  const validEvents = events.filter((e) => e && (e.id || e.title));
  const categoryCounts = getMatchCategoryCounts(validEvents);

  // Ordenar: primero los partidos EN VIVO, luego los programados
  const displayMatches = [...validEvents].sort((a, b) => {
    if (Boolean(a.isLive) === Boolean(b.isLive)) return 0;
    return a.isLive ? -1 : 1;
  });

  const filteredMatches = filterMatchesByCategory(displayMatches, filterCategory);

  return (
    <section className="my-5 w-full">
      {/* Header with Paso 12 headline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 px-1">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <h2 className="text-sm sm:text-base md:text-lg font-black tracking-wider text-white uppercase flex items-center gap-2 font-display">
            <span>🔴 PARTIDOS & TRANSMISIONES</span>
            <span className="text-[11px] font-mono font-normal text-slate-400 lowercase px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800">
              ({filteredMatches.length} {filteredMatches.length === 1 ? 'partido' : 'partidos'})
            </span>
          </h2>
        </div>

        {/* Pestañas de filtro por categoría */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {[
            { id: 'all' as MatchFilterCategory, label: 'Todos', count: categoryCounts.all, emoji: '⚽' },
            { id: 'live' as MatchFilterCategory, label: 'En Vivo', count: categoryCounts.live, emoji: '🔴' },
            { id: 'today' as MatchFilterCategory, label: 'Hoy', count: categoryCounts.today, emoji: '⏰' },
            { id: 'finished' as MatchFilterCategory, label: 'Finalizados', count: categoryCounts.finished, emoji: '🏁' },
          ].map((tab) => {
            const isActive = filterCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterCategory(tab.id)}
                className={`px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-400 text-black font-black shadow-md shadow-emerald-500/20 ring-1 ring-emerald-300'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                }`}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isActive ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of match cards (Paso 12 design: Bolívar vs The Strongest / Blooming vs Oriente) */}
      {filteredMatches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMatches.map((event, idx) => {
            const isSelected = event.id === activeEventId;
            const homeClub = clubs[event.homeTeam] || BOLIVIAN_CLUBS[event.homeTeam];
            const awayClub = clubs[event.awayTeam] || BOLIVIAN_CLUBS[event.awayTeam];
            const matchTitle = (event.title || '').trim() || (homeClub?.name && awayClub?.name ? `${homeClub.name} vs ${awayClub.name}` : `Partido ${idx + 1}`);
            const statusInfo = getMatchStatusInfo(event);

            // Provider info and styling
            const getProviderBadge = () => {
              switch (event.primaryProvider) {
                case 'cloudflare':
                  return {
                    label: '☁ Cloudflare Stream',
                    icon: <Zap className="w-3.5 h-3.5 text-sky-400" />,
                    bg: 'bg-sky-950/70 border-sky-500/40 text-sky-300',
                  };
                case 'youtube':
                  return {
                    label: '▶ YouTube Live',
                    icon: <Tv className="w-3.5 h-3.5 text-red-400" />,
                    bg: 'bg-red-950/70 border-red-500/40 text-red-300',
                  };
                case 'kick':
                  return {
                    label: '🟢 Kick Streaming',
                    icon: <Radio className="w-3.5 h-3.5 text-[#53fc18]" />,
                    bg: 'bg-emerald-950/70 border-emerald-500/40 text-[#53fc18]',
                  };
                default:
                  return {
                    label: '☁ Cloudflare Stream',
                    icon: <Zap className="w-3.5 h-3.5 text-sky-400" />,
                    bg: 'bg-slate-900 border-slate-700 text-slate-300',
                  };
              }
            };

            const providerInfo = getProviderBadge();

            return (
              <div
                key={event.id || `showcase-evt-${idx}`}
                onClick={() => onSelectEvent(event)}
                className={`relative overflow-hidden rounded-2xl transition-all duration-300 cursor-pointer p-4 sm:p-5 flex flex-col justify-between group ${
                  isSelected
                    ? 'liquid-glass-panel border-2 border-emerald-500/80 shadow-xl shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                    : 'liquid-glass-panel border border-white/10 hover:border-white/20'
                }`}
              >
                {/* Top Row: Provider Pill & Authoritative Live Status */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 border ${providerInfo.bg}`}
                  >
                    {providerInfo.icon}
                    <span>{providerInfo.label}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 shadow-sm ${statusInfo.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass} ${statusInfo.isPulsing ? 'animate-pulse' : ''}`} />
                      {statusInfo.icon === 'var' && <span>🔍</span>}
                      {statusInfo.icon === 'pause' && <span>⏸</span>}
                      {statusInfo.icon === 'finish' && <span>🏁</span>}
                      {statusInfo.icon === 'clock' && <span>⏰</span>}
                      <span>{statusInfo.label}</span>
                    </span>
                  </div>
                </div>

              {/* Middle Row: Match Title & Club Badges */}
              <div className="my-2 space-y-2">
                <h3 className="text-base sm:text-lg font-black text-white font-display group-hover:text-emerald-300 transition-colors">
                  {matchTitle}
                </h3>

                {/* Team Lineup preview */}
                <div className="flex items-center justify-between bg-black/30 rounded-xl px-3 py-2 border border-slate-800/60">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{homeClub?.badgeEmoji || '⚽'}</span>
                    <span className="text-xs font-bold text-slate-200 truncate">
                      {homeClub?.name || event.homeTeam}
                    </span>
                  </div>

                  <div className="px-2 text-xs font-mono font-black text-white bg-slate-800/80 rounded border border-slate-700">
                    {event.homeScore !== undefined && event.awayScore !== undefined
                      ? `${event.homeScore} - ${event.awayScore}`
                      : 'VS'}
                  </div>

                  <div className="flex items-center gap-2 min-w-0 justify-end">
                    <span className="text-xs font-bold text-slate-200 truncate text-right">
                      {awayClub?.name || event.awayTeam}
                    </span>
                    <span className="text-base">{awayClub?.badgeEmoji || '⚽'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span className="font-medium text-slate-300">{event.tournamentName || 'Liga Boliviana'}</span>
                  {event.stadiumName && (
                    <span className="text-slate-500 truncate max-w-[200px]">📍 {event.stadiumName}</span>
                  )}
                </div>
              </div>

              {/* Bottom Row: High Contrast Action Button */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <span>Respaldos:</span>
                  <span className="font-mono text-slate-300 uppercase">
                    {(event.fallbackOrder || []).filter((p) => p !== (event.primaryProvider || 'cloudflare')).join(', ') || 'Ninguno'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEvent(event);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                    isSelected
                      ? 'bg-emerald-400 text-black hover:bg-emerald-300 shadow-emerald-500/20'
                      : 'bg-white text-black hover:bg-slate-200 group-hover:scale-105'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>{isSelected ? 'REPRODUCIENDO AHORA' : 'VER PARTIDO'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      ) : (
        <div className="p-8 text-center rounded-2xl liquid-glass-panel border border-white/10 flex flex-col items-center justify-center gap-2">
          <p className="text-slate-300 font-semibold text-sm">
            No hay partidos registrados en la categoría &ldquo;{filterCategory === 'live' ? 'En Vivo' : filterCategory === 'today' ? 'Hoy' : 'Finalizados'}&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            className="text-xs text-emerald-400 hover:text-emerald-300 underline font-bold cursor-pointer"
          >
            Ver todos los partidos ({categoryCounts.all})
          </button>
        </div>
      )}
    </section>
  );
};
