import React from 'react';
import { LiveEvent } from '../types/football';
import { BOLIVIAN_CLUBS } from '../data/bolivianFootballData';
import { useClubs } from '../hooks/useClubs';
import { getMatchSlug } from '../utils/slug';
import { Zap, Tv, Radio, Play, ChevronRight, Activity, Flame, Shield } from 'lucide-react';

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
  // Paso 12: La portada consulta liveEvents where isLive == true
  const liveMatches = events.filter((e) => e.isLive);
  const displayMatches = liveMatches.length > 0 ? liveMatches : events;

  return (
    <section className="my-5 w-full">
      {/* Header with Paso 12 headline */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <h2 className="text-sm sm:text-base md:text-lg font-black tracking-wider text-white uppercase flex items-center gap-2 font-display">
            <span>🔴 EN VIVO AHORA</span>
            <span className="text-[11px] font-mono font-normal text-slate-400 lowercase px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 hidden sm:inline">
              ({displayMatches.length} transmisiones independientes)
            </span>
          </h2>
        </div>
        <span className="text-xs text-slate-400 font-medium hidden sm:inline">
          Selecciona un partido para ver la señal en directo
        </span>
      </div>

      {/* Grid of match cards (Paso 12 design: Bolívar vs The Strongest / Blooming vs Oriente) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayMatches.map((event) => {
          const isSelected = event.id === activeEventId;
          const slug = getMatchSlug(event);
          const homeClub = clubs[event.homeTeam] || BOLIVIAN_CLUBS[event.homeTeam];
          const awayClub = clubs[event.awayTeam] || BOLIVIAN_CLUBS[event.awayTeam];

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
              key={event.id}
              onClick={() => onSelectEvent(event)}
              className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer p-4 sm:p-5 flex flex-col justify-between group ${
                isSelected
                  ? 'bg-gradient-to-br from-slate-900 via-slate-900/95 to-emerald-950/40 border-emerald-500 shadow-xl shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                  : 'bg-slate-900/80 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Top Row: Provider Pill & Live Status */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 border ${providerInfo.bg}`}
                >
                  {providerInfo.icon}
                  <span>{providerInfo.label}</span>
                </span>

                <div className="flex items-center gap-2">
                  {event.isLive ? (
                    <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>DIRECTO</span>
                      {event.matchMinute !== undefined && <span>· {event.matchMinute}&apos;</span>}
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                      FINALIZADO
                    </span>
                  )}
                </div>
              </div>

              {/* Middle Row: Match Title & Club Badges */}
              <div className="my-2 space-y-2">
                <h3 className="text-base sm:text-lg font-black text-white font-display group-hover:text-emerald-300 transition-colors">
                  {event.title}
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
                  <span>{event.tournamentName || 'Liga Boliviana'}</span>
                  <span className="font-mono text-slate-500">/live/{slug}</span>
                </div>
              </div>

              {/* Bottom Row: High Contrast Action Button */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <span>Respaldos:</span>
                  <span className="font-mono text-slate-300 uppercase">
                    {(event.fallbackOrder || []).filter((p) => p !== event.primaryProvider).join(', ') || 'Ninguno'}
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
    </section>
  );
};
