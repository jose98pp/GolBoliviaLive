import React, { useState } from 'react';
import {
  Trophy,
  Activity,
  Users,
  Clock,
  AlertCircle,
  TrendingUp,
  MapPin,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { MatchStats as IMatchStats, MatchEvent, StreamSettings } from '../types/football';
import {
  BOLIVIAN_CLUBS,
  INITIAL_MATCH_STATS,
  INITIAL_EVENTS,
  STANDINGS_DATA,
  LINEUPS_DATA
} from '../data/bolivianFootballData';
import { useClubs } from '../hooks/useClubs';

interface MatchStatsProps {
  homeScore: number;
  awayScore: number;
  matchMinute: number;
  streamSettings?: StreamSettings;
  events?: MatchEvent[];
  isClockRunning?: boolean;
  onToggleMatchClock?: () => void;
}

export const MatchStats: React.FC<MatchStatsProps> = ({
  homeScore,
  awayScore,
  matchMinute,
  streamSettings,
  events: propEvents,
  isClockRunning = false,
  onToggleMatchClock,
}) => {
  const [statsTab, setStatsTab] = useState<'timeline' | 'stats' | 'lineups' | 'table'>('timeline');
  const [matchStats] = useState<IMatchStats>(INITIAL_MATCH_STATS);
  const events = propEvents || INITIAL_EVENTS;
  const { clubs } = useClubs();

  const homeClub = (streamSettings && clubs[streamSettings.homeClubId]) || clubs.bolivar || BOLIVIAN_CLUBS.bolivar;
  const awayClub = (streamSettings && clubs[streamSettings.awayClubId]) || clubs.strongest || BOLIVIAN_CLUBS.strongest;

  return (
    <div className="bg-[#0a0f1d] border border-slate-800/80 rounded-2xl p-4 md:p-6 shadow-xl">
      {/* HEADER / MATCH SUMMARY SCORECARD */}
      <div className="bg-gradient-to-r from-[#0d1627] via-[#091122] to-[#0d1627] border border-slate-700/60 rounded-xl p-4 md:p-5 mb-5 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-bold text-white uppercase tracking-wider font-display">
              {streamSettings?.tournamentName || 'División Profesional'}
            </span>
            <span>·</span>
            <span>Fecha 22 / Torneo Clausura</span>
          </div>
          <button
            type="button"
            onClick={onToggleMatchClock}
            className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
              isClockRunning
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 ring-1 ring-emerald-500/30'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
            }`}
            title={isClockRunning ? "Marcador automático activo: clic para pausar" : "Clic para iniciar minutos automáticamente"}
          >
            <span className={`w-2 h-2 rounded-full ${isClockRunning ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
            <span className="font-bold">
              Minuto {matchMinute}&apos; ({streamSettings?.period || '2T'})
            </span>
            <span className="text-[10px] text-amber-400 ml-0.5">
              {isClockRunning ? '⏱ Auto' : '▶ Clic Iniciar'}
            </span>
          </button>
        </div>

        {/* CLUBS SCORE ROW */}
        <div className="grid grid-cols-7 items-center text-center">
          {/* Home team */}
          <div className="col-span-3 flex flex-col md:flex-row items-center justify-center md:justify-end gap-2 md:gap-3">
            <div className="text-right">
              <h3 className="font-display font-extrabold text-base md:text-xl text-white">
                {homeClub.name}
              </h3>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 justify-center md:justify-end">
                <span>{homeClub.city}</span>
                <span>·</span>
                <span className="text-sky-400 font-medium">
                  {homeClub.league ? (homeClub.league.includes('España') ? '🇪🇸 LaLiga' : homeClub.league.includes('Inglaterra') ? '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier' : '🇧🇴 Bolivia') : 'Titular'}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sky-950/70 border border-sky-500/50 flex items-center justify-center text-2xl shadow-md shrink-0">
              {homeClub.badgeEmoji}
            </div>
          </div>

          {/* Central Score - Clic para Iniciar o Pausar Reloj */}
          <button
            type="button"
            onClick={onToggleMatchClock}
            className={`col-span-1 flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer group select-none active:scale-95 ${
              isClockRunning
                ? 'bg-emerald-950/40 border border-emerald-500/50 shadow-lg shadow-emerald-950/40'
                : 'hover:bg-slate-800/60 border border-transparent hover:border-slate-700'
            }`}
            title={isClockRunning ? "Marcador corriendo automáticamente: Clic para pausar" : "Clic para iniciar minutos automáticamente"}
          >
            <div className="flex items-center gap-2 font-display text-2xl md:text-4xl font-black text-white tabular-nums tracking-tight">
              <span className="group-hover:text-emerald-400 transition-colors">{homeScore}</span>
              <span className="text-slate-600">-</span>
              <span className="group-hover:text-emerald-400 transition-colors">{awayScore}</span>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1 ${
              isClockRunning ? 'text-emerald-400 animate-pulse' : 'text-slate-400 group-hover:text-amber-400'
            }`}>
              {isClockRunning ? '● Corriendo Auto' : '▶ Clic Iniciar Reloj'}
            </span>
          </button>

          {/* Away team */}
          <div className="col-span-3 flex flex-col-reverse md:flex-row items-center justify-center md:justify-start gap-2 md:gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-950/70 border border-amber-500/50 flex items-center justify-center text-2xl shadow-md shrink-0">
              {awayClub.badgeEmoji}
            </div>
            <div className="text-left">
              <h3 className="font-display font-extrabold text-base md:text-xl text-white">
                {awayClub.name}
              </h3>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 justify-center md:justify-start">
                <span className="text-amber-400 font-medium">Atigrado</span>
                <span>·</span>
                <span>La Paz</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stadium & Location metadata */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-400">
          <MapPin className="w-3.5 h-3.5 text-red-400" />
          <span>{streamSettings?.stadiumName || 'Estadio Olímpico Hernando Siles'}</span>
          <span>·</span>
          <span className="font-mono tabular-nums text-slate-300">
            {streamSettings?.altitudeMeters || homeClub.altitudeMeters} m s.n.m.
          </span>
          <span>·</span>
          <span>Árbitro: Ivo Méndez</span>
        </div>
      </div>

      {/* STATS TABS NAVIGATION */}
      <div className="flex items-center gap-1.5 p-1 bg-[#070b15] border border-slate-800 rounded-xl mb-4 text-xs font-semibold">
        <button
          onClick={() => setStatsTab('timeline')}
          className={`flex-1 py-2 px-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
            statsTab === 'timeline' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Minuto a Minuto</span>
        </button>
        <button
          onClick={() => setStatsTab('stats')}
          className={`flex-1 py-2 px-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
            statsTab === 'stats' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-yellow-400" />
          <span>Estadísticas</span>
        </button>
        <button
          onClick={() => setStatsTab('lineups')}
          className={`flex-1 py-2 px-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
            statsTab === 'lineups' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-sky-400" />
          <span>Alineaciones</span>
        </button>
        <button
          onClick={() => setStatsTab('table')}
          className={`flex-1 py-2 px-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
            statsTab === 'table' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>Tabla Liga</span>
        </button>
      </div>

      {/* TAB CONTENT 1: MINUTO A MINUTO TIMELINE */}
      {statsTab === 'timeline' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Eventos Destacados del Partido</span>
            <span className="text-emerald-400 font-mono">Actualizado en vivo</span>
          </div>

          <div className="space-y-2.5">
            {events.slice().reverse().map((ev) => {
              const club = ev.clubId ? (clubs[ev.clubId] || BOLIVIAN_CLUBS[ev.clubId]) : null;

              return (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl bg-[#0d1424] border border-slate-800/80 hover:border-slate-700 transition-colors flex items-start gap-3"
                >
                  <div className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-emerald-400 font-mono font-bold text-xs tabular-nums shrink-0">
                    {ev.minute}&apos;
                  </div>

                  <div className="flex-1 text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      {ev.type === 'goal' && (
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-500/40 text-[10px]">
                          ⚽ ¡GOL!
                        </span>
                      )}
                      {ev.type === 'yellow_card' && (
                        <span className="px-2 py-0.5 rounded bg-yellow-950 text-yellow-300 font-bold border border-yellow-500/40 text-[10px]">
                          🟨 AMARILLA
                        </span>
                      )}
                      {ev.type === 'substitution' && (
                        <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-bold border border-blue-500/40 text-[10px]">
                          🔄 CAMBIO
                        </span>
                      )}
                      {ev.type === 'var' && (
                        <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 font-bold border border-purple-500/40 text-[10px]">
                          🛑 VAR CHECK
                        </span>
                      )}

                      {club && (
                        <span className="font-semibold text-slate-300">
                          {club.shortName}
                        </span>
                      )}
                      {ev.player && (
                        <>
                          <span className="text-slate-500">·</span>
                          <span className="text-white font-medium">{ev.player}</span>
                        </>
                      )}
                    </div>

                    <p className="text-slate-300 leading-relaxed text-xs">{ev.description}</p>
                    {ev.scoreAfter && (
                      <div className="mt-1.5 inline-block font-mono text-[11px] font-bold text-emerald-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                        Marcador parcial: {ev.scoreAfter}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: LIVE STATISTICS BARS */}
      {statsTab === 'stats' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-2">
            <span className="text-sky-400">{homeClub.name}</span>
            <span className="text-slate-500 font-normal">Comparativa en Vivo</span>
            <span className="text-amber-400">{awayClub.name}</span>
          </div>

          {/* Possession Bar */}
          <div className="p-3 bg-[#0d1424] rounded-xl border border-slate-800/80">
            <div className="flex justify-between text-xs font-semibold mb-1.5 font-mono">
              <span className="text-sky-400">{matchStats.possession[0]}%</span>
              <span className="text-slate-300 font-sans text-xs">Posesión de Balón</span>
              <span className="text-amber-400">{matchStats.possession[1]}%</span>
            </div>
            <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="bg-sky-500 h-full transition-all duration-500"
                style={{ width: `${matchStats.possession[0]}%` }}
              />
              <div
                className="bg-amber-500 h-full transition-all duration-500"
                style={{ width: `${matchStats.possession[1]}%` }}
              />
            </div>
          </div>

          {/* Numerical stats rows */}
          <div className="space-y-2">
            {[
              { label: 'Tiros al arco', valHome: matchStats.shotsOnTarget[0], valAway: matchStats.shotsOnTarget[1] },
              { label: 'Tiros totales', valHome: matchStats.shots[0], valAway: matchStats.shots[1] },
              { label: 'Tiros de esquina (Córners)', valHome: matchStats.corners[0], valAway: matchStats.corners[1] },
              { label: 'Faltas cometidas', valHome: matchStats.fouls[0], valAway: matchStats.fouls[1] },
              { label: 'Tarjetas amarillas', valHome: matchStats.yellowCards[0], valAway: matchStats.yellowCards[1] },
              { label: 'Fueras de juego (Offsides)', valHome: matchStats.offsides[0], valAway: matchStats.offsides[1] },
              { label: 'Pases completados', valHome: matchStats.passes[0], valAway: matchStats.passes[1] },
              { label: 'Precisión de pases', valHome: `${matchStats.passAccuracy[0]}%`, valAway: `${matchStats.passAccuracy[1]}%` },
            ].map((stat) => (
              <div
                key={stat.label}
                className="px-3 py-2 bg-[#0c1220] rounded-lg border border-slate-800/60 flex items-center justify-between text-xs font-mono"
              >
                <span className="text-white font-bold w-12 text-left tabular-nums">{stat.valHome}</span>
                <span className="text-slate-400 font-sans text-xs">{stat.label}</span>
                <span className="text-white font-bold w-12 text-right tabular-nums">{stat.valAway}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: LINEUPS & TACTICAL FORMATIONS */}
      {statsTab === 'lineups' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Home Lineup */}
            <div className="p-3.5 bg-[#0d1424] rounded-xl border border-sky-500/30">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <div>
                  <h4 className="font-bold text-white text-xs">{LINEUPS_DATA.home.club.name}</h4>
                  <span className="text-[11px] text-slate-400">DT: {LINEUPS_DATA.home.coach}</span>
                </div>
                <span className="px-2 py-0.5 bg-sky-950 text-sky-400 font-mono font-bold text-xs rounded border border-sky-800">
                  {LINEUPS_DATA.home.formation}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                {LINEUPS_DATA.home.starting.map((p) => (
                  <div key={p.number} className="flex items-center justify-between py-1 border-b border-slate-800/50">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-sky-600/30 text-sky-400 font-mono text-[10px] font-bold flex items-center justify-center">
                        {p.number}
                      </span>
                      <span className="text-slate-200">{p.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono font-semibold">{p.position}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Away Lineup */}
            <div className="p-3.5 bg-[#0d1424] rounded-xl border border-amber-500/30">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <div>
                  <h4 className="font-bold text-white text-xs">{LINEUPS_DATA.away.club.name}</h4>
                  <span className="text-[11px] text-slate-400">DT: {LINEUPS_DATA.away.coach}</span>
                </div>
                <span className="px-2 py-0.5 bg-amber-950 text-amber-400 font-mono font-bold text-xs rounded border border-amber-800">
                  {LINEUPS_DATA.away.formation}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                {LINEUPS_DATA.away.starting.map((p) => (
                  <div key={p.number} className="flex items-center justify-between py-1 border-b border-slate-800/50">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-600/30 text-amber-400 font-mono text-[10px] font-bold flex items-center justify-center">
                        {p.number}
                      </span>
                      <span className="text-slate-200">{p.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono font-semibold">{p.position}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: LEAGUE STANDINGS TABLE */}
      {statsTab === 'table' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-mono uppercase tracking-wider">
                <th className="py-2.5 px-2">#</th>
                <th className="py-2.5 px-3">Club</th>
                <th className="py-2.5 px-2 text-center">PJ</th>
                <th className="py-2.5 px-2 text-center">G</th>
                <th className="py-2.5 px-2 text-center">E</th>
                <th className="py-2.5 px-2 text-center">P</th>
                <th className="py-2.5 px-2 text-center">DG</th>
                <th className="py-2.5 px-2 text-right font-bold text-white">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {STANDINGS_DATA.map((row) => {
                const isSelectedMatch = row.clubId === 'bolivar' || row.clubId === 'strongest';
                const club = clubs[row.clubId] || BOLIVIAN_CLUBS[row.clubId];

                return (
                  <tr
                    key={row.clubId}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isSelectedMatch ? 'bg-slate-800/20' : ''
                    }`}
                  >
                    <td className="py-2.5 px-2 font-bold text-slate-400 tabular-nums">
                      {row.position}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-medium text-white flex items-center gap-2">
                      <span>{club?.badgeEmoji || '⚽'}</span>
                      <span>{row.name}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-300 tabular-nums">{row.played}</td>
                    <td className="py-2.5 px-2 text-center text-slate-300 tabular-nums">{row.won}</td>
                    <td className="py-2.5 px-2 text-center text-slate-300 tabular-nums">{row.drawn}</td>
                    <td className="py-2.5 px-2 text-center text-slate-300 tabular-nums">{row.lost}</td>
                    <td className="py-2.5 px-2 text-center text-slate-300 tabular-nums">{row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-emerald-400 tabular-nums text-sm">
                      {row.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
