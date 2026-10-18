import React, { useState, useEffect, useRef } from 'react';
import { useAutoSave } from '../hooks/useAutoSave';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import {
  Trophy,
  MapPin,
  Save,
  CheckCircle2,
  Sparkles,
  ArrowLeftRight,
  Radio,
  FileText,
  Mountain,
  AlertCircle,
  Plus,
  Trash2,
  Play,
  Pause,
  RefreshCw,
  Clock,
  Shield,
  Activity,
  Zap,
  Download,
} from 'lucide-react';
import { StreamSettings, LiveEvent, MatchEvent } from '../types/football';
import { groupClubsByLeague, PRESET_INTERNATIONAL_MATCHES } from '../data/bolivianFootballData';
import { useClubs } from '../hooks/useClubs';
import { apiClient } from '../services/apiClient';
import { espnFootballApi, ApiMatchSummary } from '../services/espnFootballApi';

export type MatchPeriod = '1T' | 'Descanso' | '2T' | 'Tiempo Extra' | 'Finalizado' | 'Revisión VAR';

export interface MatchDetailsEditorProps {
  streamSettings: StreamSettings;
  onUpdateStreamSettings: (newSettings: Partial<StreamSettings>) => void;
  activeEventId?: string;
  activeEvent?: LiveEvent;
  onUpdateLiveEvent?: (eventData: Partial<any>) => void;
  liveEvents?: LiveEvent[];
  onSelectEvent?: (eventId: string) => void;
  homeScore?: number;
  awayScore?: number;
  matchMinute?: number;
  onUpdateScore?: (home: number, away: number) => void;
  onUpdateMinute?: (minute: number) => void;
  isClockRunning?: boolean;
  onToggleMatchClock?: (running: boolean) => void;
  onUpdatePeriod?: (period: MatchPeriod) => void;
  onClearEvents?: () => void;
  onClearChat?: () => void;
  onDeleteEvent?: (eventId: string) => void;
  events?: MatchEvent[];
}

const TOURNAMENT_PRESETS = [
  'Liga Tigo División Profesional - Torneo Clausura',
  'Liga Tigo División Profesional - Torneo Apertura',
  'Copa de la División Profesional de Bolivia',
  'Copa Simón Bolívar - Nacional B',
  'Amistoso Internacional FIFA',
  'Copa CONMEBOL Libertadores',
];

export const MatchDetailsEditor: React.FC<MatchDetailsEditorProps> = ({
  streamSettings,
  onUpdateStreamSettings,
  activeEventId,
  activeEvent,
  onUpdateLiveEvent,
  liveEvents = [],
  onSelectEvent,
  onDeleteEvent,
  homeScore = 0,
  awayScore = 0,
  matchMinute = 0,
  onUpdateScore,
  onUpdateMinute,
  isClockRunning = false,
  onToggleMatchClock,
  onUpdatePeriod,
  onClearEvents,
  onClearChat,
  events = [],
}) => {
  const { clubs } = useClubs();

  // Internal form fields
  const [title, setTitle] = useState(activeEvent?.title || streamSettings?.title || '');
  const [tournamentName, setTournamentName] = useState(activeEvent?.tournamentName || streamSettings?.tournamentName || '');
  const [homeClubId, setHomeClubId] = useState(activeEvent?.homeTeam || streamSettings?.homeClubId || 'bolivar');
  const [awayClubId, setAwayClubId] = useState(activeEvent?.awayTeam || streamSettings?.awayClubId || 'strongest');
  const [stadiumName, setStadiumName] = useState(activeEvent?.stadiumName || streamSettings?.stadiumName || '');
  const [altitudeMeters, setAltitudeMeters] = useState(streamSettings?.altitudeMeters || 3637);
  const [officialAnnouncement, setOfficialAnnouncement] = useState(streamSettings?.officialAnnouncement || '');
  const [isLiveMatch, setIsLiveMatch] = useState<boolean>(activeEvent?.isLive ?? streamSettings?.isLive ?? true);
  const [period, setPeriod] = useState<MatchPeriod>((activeEvent?.period as MatchPeriod) || streamSettings?.period || '1T');

  // Local score & minute state for responsive, rock-solid editing
  const [localHomeScore, setLocalHomeScore] = useState<number>(activeEvent?.homeScore ?? homeScore);
  const [localAwayScore, setLocalAwayScore] = useState<number>(activeEvent?.awayScore ?? awayScore);
  const [localMinute, setLocalMinute] = useState<number>(activeEvent?.matchMinute ?? matchMinute);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const prevEventIdRef = useRef(activeEventId);

  // Sync state when selected match changes
  useEffect(() => {
    if (prevEventIdRef.current !== activeEventId) {
      prevEventIdRef.current = activeEventId;
      setIsDirty(false);
      const srcTitle = activeEvent?.title || streamSettings?.title || '';
      const srcTourn = activeEvent?.tournamentName || streamSettings?.tournamentName || '';
      const srcHome = activeEvent?.homeTeam || streamSettings?.homeClubId || 'bolivar';
      const srcAway = activeEvent?.awayTeam || streamSettings?.awayClubId || 'strongest';
      const srcStadium = activeEvent?.stadiumName || streamSettings?.stadiumName || '';
      const srcPeriod = (activeEvent?.period || streamSettings?.period || '1T') as MatchPeriod;
      const srcIsLive = activeEvent?.isLive ?? streamSettings?.isLive ?? true;

      setTitle(srcTitle);
      setTournamentName(srcTourn);
      setHomeClubId(srcHome);
      setAwayClubId(srcAway);
      setStadiumName(srcStadium);
      setPeriod(srcPeriod);
      setIsLiveMatch(srcIsLive);
      setLocalHomeScore(activeEvent?.homeScore ?? homeScore);
      setLocalAwayScore(activeEvent?.awayScore ?? awayScore);
      setLocalMinute(activeEvent?.matchMinute ?? matchMinute);
    } else if (!isDirty) {
      if (activeEvent?.title) setTitle(activeEvent.title);
      if (activeEvent?.tournamentName) setTournamentName(activeEvent.tournamentName);
      if (activeEvent?.homeTeam) setHomeClubId(activeEvent.homeTeam);
      if (activeEvent?.awayTeam) setAwayClubId(activeEvent.awayTeam);
      if (activeEvent?.stadiumName) setStadiumName(activeEvent.stadiumName);
      if (activeEvent?.period) setPeriod(activeEvent.period as MatchPeriod);
      if (activeEvent?.isLive !== undefined) setIsLiveMatch(activeEvent.isLive);
      setLocalHomeScore(activeEvent?.homeScore ?? homeScore);
      setLocalAwayScore(activeEvent?.awayScore ?? awayScore);
      setLocalMinute(activeEvent?.matchMinute ?? matchMinute);
    }
  }, [activeEventId, activeEvent, streamSettings, isDirty, homeScore, awayScore, matchMinute]);

  // Free Football API (ESPN) state
  const [apiLeague, setApiLeague] = useState<string>('bol.1');
  const [apiMatches, setApiMatches] = useState<ApiMatchSummary[]>([]);
  const [isLoadingApiMatches, setIsLoadingApiMatches] = useState<boolean>(false);
  const [selectedApiMatchId, setSelectedApiMatchId] = useState<string>('');
  const [apiFeedback, setApiFeedback] = useState<string | null>(null);
  const [clearActionFeedback, setClearActionFeedback] = useState<string | null>(null);

  const handleLoadApiMatches = async () => {
    setIsLoadingApiMatches(true);
    setApiFeedback(null);
    try {
      const matches = await espnFootballApi.getMatches(apiLeague);
      setApiMatches(matches);
      if (matches.length > 0) {
        setSelectedApiMatchId(matches[0].id);
        setApiFeedback(`¡Se encontraron ${matches.length} partidos oficiales en la API de ESPN!`);
      } else {
        setApiFeedback('No hay partidos programados en este momento para la liga seleccionada.');
      }
    } catch {
      setApiFeedback('No se pudo conectar con la API deportiva.');
    } finally {
      setIsLoadingApiMatches(false);
      setTimeout(() => setApiFeedback(null), 5000);
    }
  };

  const handleImportSelectedApiMatch = () => {
    if (!selectedApiMatchId) return;
    const match = apiMatches.find((m) => m.id === selectedApiMatchId);
    if (!match) return;

    setIsDirty(true);
    const newTitle = `${match.homeTeam.displayName} vs ${match.awayTeam.displayName} — En Vivo`;
    setTitle(newTitle);

    const foundHomeKey = Object.keys(clubs).find((k) =>
      clubs[k].name.toLowerCase().includes(match.homeTeam.displayName.toLowerCase()) ||
      match.homeTeam.displayName.toLowerCase().includes(clubs[k].name.toLowerCase())
    );
    if (foundHomeKey) setHomeClubId(foundHomeKey);

    const foundAwayKey = Object.keys(clubs).find((k) =>
      clubs[k].name.toLowerCase().includes(match.awayTeam.displayName.toLowerCase()) ||
      match.awayTeam.displayName.toLowerCase().includes(clubs[k].name.toLowerCase())
    );
    if (foundAwayKey) setAwayClubId(foundAwayKey);

    if (match.venue) setStadiumName(match.venue);

    if (match.isLive || match.isFinished || match.homeTeam.score > 0 || match.awayTeam.score > 0) {
      setLocalHomeScore(match.homeTeam.score);
      setLocalAwayScore(match.awayTeam.score);
      onUpdateScore?.(match.homeTeam.score, match.awayTeam.score);
      if (typeof match.minute === 'number') {
        setLocalMinute(match.minute);
        onUpdateMinute?.(match.minute);
      }
    }

    setApiFeedback(`¡Datos de "${match.homeTeam.displayName} vs ${match.awayTeam.displayName}" importados al formulario!`);
    setTimeout(() => setApiFeedback(null), 5000);
  };

  const handleGenerateTitle = () => {
    setIsDirty(true);
    const home = clubs[homeClubId]?.name || 'Local';
    const away = clubs[awayClubId]?.name || 'Visitante';
    const generated = `${home} vs ${away} — Fútbol Boliviano en Vivo`;
    setTitle(generated);
  };

  const handleAutofillStadiumFromHomeClub = () => {
    setIsDirty(true);
    const club = clubs[homeClubId];
    if (club) {
      setStadiumName(`${club.stadium} - ${club.city}`);
      setAltitudeMeters(club.altitudeMeters);
    }
  };

  const handleSwapClubs = () => {
    setIsDirty(true);
    const tempHome = homeClubId;
    setHomeClubId(awayClubId);
    setAwayClubId(tempHome);
  };

  const handleCreateNewMatch = async () => {
    const existingNums = liveEvents
      .map((e) => {
        const m = e.id.match(/partido-(\d+)/);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));
    const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : liveEvents.length + 1;
    const newId = `partido-${String(nextNum).padStart(3, '0')}`;

    const newEv: LiveEvent = {
      id: newId,
      title: `Nuevo Partido ${nextNum}`,
      homeTeam: 'bolivar',
      awayTeam: 'strongest',
      isLive: true,
      primaryProvider: 'cloudflare',
      cloudflare: {
        liveInputId: '',
        playbackUrl: '',
      },
      youtube: { videoId: '' },
      kick: { channel: '' },
      fallbackOrder: ['cloudflare', 'youtube', 'kick'],
      tournamentName: 'Liga Tigo División Profesional',
      stadiumName: 'Estadio Olímpico Hernando Siles - La Paz',
      period: '1T',
      homeScore: 0,
      awayScore: 0,
      matchMinute: 0,
      version: 1,
      updatedAt: Date.now(),
    };

    setIsSaving(true);
    try {
      const confirmed = await apiClient.saveLiveEvent(newEv);
      onSelectEvent?.(confirmed.id);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMsg('Error al crear nuevo partido: ' + (err.message || 'Error de permisos'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCurrentMatch = async (targetId?: string) => {
    if (liveEvents.length <= 1) {
      alert('Debe existir al menos un partido registrado en el sistema. Puedes editar el partido actual en el formulario si deseas cambiarlo.');
      return;
    }
    const currentId = targetId || activeEventId || activeEvent?.id || 'partido-001';
    const targetEvt = liveEvents.find((e) => e.id === currentId);
    const targetTitle = targetEvt?.title || title || 'este partido';

    if (!confirm(`¿Estás seguro de eliminar el partido "${targetTitle}"?`)) return;

    setIsSaving(true);
    setErrorMsg(null);
    try {
      await apiClient.deleteLiveEvent(currentId);
      onDeleteEvent?.(currentId);
      const remaining = liveEvents.filter((e) => e.id !== currentId);
      if (remaining.length > 0) {
        onSelectEvent?.(remaining[0].id);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('[MatchDetailsEditor] Error al eliminar partido:', err);
      setErrorMsg('Error al eliminar partido: ' + (err.message || 'No autorizado'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePeriodChange = (p: MatchPeriod) => {
    setPeriod(p);
    setIsDirty(true);
    onUpdatePeriod?.(p);
    onUpdateStreamSettings({ period: p });
  };

  const formKey = JSON.stringify([
    title, tournamentName, homeClubId, awayClubId, stadiumName, altitudeMeters, officialAnnouncement,
    isLiveMatch, period, localHomeScore, localAwayScore, localMinute,
  ]);
  const formKeyRef = useRef(formKey);
  formKeyRef.current = formKey;

  const handleSubmit = async (e?: React.FormEvent): Promise<boolean> => {
    if (e) e.preventDefault();
    const savedFormKey = formKeyRef.current;
    setErrorMsg(null);
    setSaveSuccess(false);

    const cleanTitle = title.trim();
    const cleanTournament = tournamentName.trim();
    const cleanStadium = stadiumName.trim();
    const cleanHomeId = homeClubId.trim().toLowerCase();
    const cleanAwayId = awayClubId.trim().toLowerCase();
    const alt = Number(altitudeMeters);

    // Validations
    if (!cleanTitle || cleanTitle.length < 3) {
      setErrorMsg('El título del partido debe tener al menos 3 caracteres.');
      return false;
    }
    if (cleanHomeId === cleanAwayId) {
      setErrorMsg('El club local y visitante no pueden ser el mismo equipo.');
      return false;
    }

    setIsSaving(true);

    const activeId = activeEventId || activeEvent?.id || 'partido-001';
    const currentEvt = activeEvent || liveEvents.find((e) => e.id === activeId);

    // Preservar exactamente las fuentes de streaming configuradas en la Pestaña 1
    const preservedCloudflare = currentEvt?.cloudflare || streamSettings.cloudflare || { liveInputId: '', playbackUrl: streamSettings.customVideoUrl || '' };
    const preservedYoutube = currentEvt?.youtube || streamSettings.youtube || { videoId: '' };
    const preservedKick = currentEvt?.kick || streamSettings.kick || { channel: '' };
    const preservedCustomVideoUrl = currentEvt?.customVideoUrl || streamSettings.customVideoUrl || '';
    const preservedPrimaryProvider = currentEvt?.primaryProvider || streamSettings.primaryProvider || 'cloudflare';

    const fullEventPayload: LiveEvent = {
      id: activeId,
      title: cleanTitle,
      homeTeam: cleanHomeId,
      awayTeam: cleanAwayId,
      tournamentName: cleanTournament || 'Liga Tigo División Profesional',
      stadiumName: cleanStadium || 'Estadio Departamental',
      isLive: isLiveMatch,
      homeScore: localHomeScore,
      awayScore: localAwayScore,
      matchMinute: localMinute,
      period,
      primaryProvider: preservedPrimaryProvider,
      fallbackOrder: currentEvt?.fallbackOrder || streamSettings.fallbackOrder || ['cloudflare', 'youtube', 'kick'],
      cloudflare: preservedCloudflare,
      youtube: preservedYoutube,
      kick: preservedKick,
      customVideoUrl: preservedCustomVideoUrl,
      activeStreamSource: currentEvt?.activeStreamSource || streamSettings.activeStreamSource || 'obs',
      autoFailoverEnabled: currentEvt?.autoFailoverEnabled ?? streamSettings.autoFailoverEnabled ?? true,
      isClockRunning,
      clockUpdatedAt: Date.now(),
      version: typeof currentEvt?.version === 'number' ? currentEvt.version : undefined,
      force: true,
    };

    try {
      // 1. Guardar partido completo en Firebase y Servidor (apiClient.saveLiveEvent)
      await apiClient.saveLiveEvent(fullEventPayload);

      // 2. Actualizar marcador oficial
      await apiClient.updateScoreboard({
        activeEventId: activeId,
        homeScore: localHomeScore,
        awayScore: localAwayScore,
        matchMinute: localMinute,
        period,
        isClockRunning,
      });

      // 3. Sincronizar streamSettings para consistencia
      const streamPayload: Partial<StreamSettings> = {
        title: cleanTitle,
        tournamentName: cleanTournament,
        homeClubId: cleanHomeId,
        awayClubId: cleanAwayId,
        stadiumName: cleanStadium,
        altitudeMeters: Math.round(alt),
        officialAnnouncement: officialAnnouncement.trim().slice(0, 200),
        homeScore: localHomeScore,
        awayScore: localAwayScore,
        matchMinute: localMinute,
        period,
        isLive: isLiveMatch,
      };

      onUpdateStreamSettings(streamPayload);
      onUpdateScore?.(localHomeScore, localAwayScore);
      onUpdateMinute?.(localMinute);

      if (onUpdateLiveEvent) {
        onUpdateLiveEvent(fullEventPayload);
      }

      setIsDirty(formKeyRef.current !== savedFormKey);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
      return true;
    } catch (err: any) {
      console.error('[MatchDetailsEditor] Error al guardar partido y marcador:', err);
      setErrorMsg(err.message || 'Error al guardar los datos en el servidor.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const autoSaveStatus = useAutoSave({ isDirty: false, changeKey: formKey, save: () => Promise.resolve(true) });

  const homeClub = clubs[homeClubId] || { name: 'Local', badgeEmoji: '⚽', city: 'Bolivia', primaryColor: '#0284c7' };
  const awayClub = clubs[awayClubId] || { name: 'Visitante', badgeEmoji: '⚽', city: 'Bolivia', primaryColor: '#eab308' };

  return (
    <div className="space-y-6">
      {/* 1. BARRA DE SELECCIÓN Y CREACIÓN DE PARTIDOS */}
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80 mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">
              Gestor de Partidos Registrados
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {liveEvents.length} {liveEvents.length === 1 ? 'partido' : 'partidos'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreateNewMatch}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5 text-black" />
              <span>Crear Nuevo Partido</span>
            </button>

            {liveEvents.length > 1 && (
              <button
                type="button"
                onClick={() => handleDeleteCurrentMatch()}
                disabled={isSaving}
                className="px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95 disabled:opacity-50"
                title="Eliminar el partido actual"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Eliminar Partido Actual</span>
              </button>
            )}
          </div>
        </div>

        {/* Match Pills Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {liveEvents.map((evt) => {
            const isSelected = evt.id === (activeEventId || activeEvent?.id);
            const h = clubs[evt.homeTeam]?.name || evt.homeTeam || 'Local';
            const a = clubs[evt.awayTeam]?.name || evt.awayTeam || 'Visitante';
            return (
              <div
                key={evt.id}
                className={`flex items-center rounded-xl transition-all shadow-sm ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-black shadow-amber-950/40 ring-2 ring-amber-300'
                    : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectEvent?.(evt.id)}
                  className="px-3 py-2 text-xs font-bold cursor-pointer flex items-center gap-2"
                >
                  <span className="flex items-center gap-1">
                    <span>{h}</span>
                    <span className="text-[11px] font-mono font-black opacity-80">
                      {evt.homeScore ?? 0} - {evt.awayScore ?? 0}
                    </span>
                    <span>{a}</span>
                  </span>
                  {evt.isLive && (
                    <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-black animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
                  )}
                </button>

                {liveEvents.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCurrentMatch(evt.id);
                    }}
                    className={`pr-2.5 pl-1 py-2 text-xs transition cursor-pointer flex items-center ${
                      isSelected
                        ? 'text-black/60 hover:text-red-700'
                        : 'text-slate-500 hover:text-red-400'
                    }`}
                    title={`Eliminar partido ${h} vs ${a}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. TABLERO DE MARCADOR OFICIAL EN DIRECTO (LIVE SCOREBOARD CARD) */}
      <div className="bg-[#070b14] border-2 border-emerald-500/50 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-800/80 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-white font-display uppercase tracking-wide">
                  Tablero Oficial del Marcador
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  MARCADOR TV
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Edita los goles, el minuto y el reloj automático. Los hinchas ven los cambios al instante.
              </p>
            </div>
          </div>

          {/* Toggle Transmisión EN VIVO / FINALIZADA */}
          <button
            type="button"
            onClick={() => {
              const nextLive = !isLiveMatch;
              setIsLiveMatch(nextLive);
              setIsDirty(true);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-md ${
              isLiveMatch
                ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-300'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLiveMatch ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
            <span>{isLiveMatch ? '🔴 EN VIVO' : '⚪ FINALIZADO'}</span>
          </button>
        </div>

        {/* Marcador Visual e Inputs de Goles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center my-2">
          {/* Local Team Stepper */}
          <div className="p-4 rounded-xl bg-[#0a0f1d] border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{homeClub.badgeEmoji || '⚽'}</span>
              <div>
                <span className="text-xs font-bold text-white block truncate max-w-[120px] sm:max-w-[150px]">
                  {homeClub.name}
                </span>
                <span className="text-[10px] text-sky-400 font-semibold">Local</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const val = Math.max(0, localHomeScore - 1);
                  setLocalHomeScore(val);
                  setIsDirty(true);
                  onUpdateScore?.(val, localAwayScore);
                }}
                disabled={localHomeScore <= 0}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-750 disabled:opacity-30 text-white font-bold flex items-center justify-center cursor-pointer transition text-base"
              >
                -
              </button>
              <input
                type="number"
                min={0}
                max={50}
                value={localHomeScore}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    const clamped = Math.max(0, Math.min(50, val));
                    setLocalHomeScore(clamped);
                    setIsDirty(true);
                    onUpdateScore?.(clamped, localAwayScore);
                  }
                }}
                className="w-12 h-9 text-center bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg font-mono text-xl font-black text-white tabular-nums focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const val = Math.min(50, localHomeScore + 1);
                  setLocalHomeScore(val);
                  setIsDirty(true);
                  onUpdateScore?.(val, localAwayScore);
                }}
                disabled={localHomeScore >= 50}
                className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-black font-black flex items-center justify-center cursor-pointer transition text-base shadow-sm"
              >
                +
              </button>
            </div>
          </div>

          {/* Central Minute & Clock Controls */}
          <div className="p-4 rounded-xl bg-[#0a0f1d] border border-slate-800 flex flex-col items-center justify-center text-center space-y-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const val = Math.max(0, localMinute - 1);
                  setLocalMinute(val);
                  setIsDirty(true);
                  onUpdateMinute?.(val);
                }}
                disabled={localMinute <= 0}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-750 disabled:opacity-30 text-white font-bold flex items-center justify-center cursor-pointer text-xs"
              >
                -
              </button>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min={0}
                  max={130}
                  value={localMinute}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      const clamped = Math.max(0, Math.min(130, val));
                      setLocalMinute(clamped);
                      setIsDirty(true);
                      onUpdateMinute?.(clamped);
                    }
                  }}
                  className="w-16 h-9 text-center bg-slate-900 border border-emerald-500/50 rounded-lg font-mono text-xl font-black text-emerald-400 tabular-nums focus:outline-none pr-3"
                />
                <span className="absolute right-1 text-xs font-mono text-emerald-500 pointer-events-none">&apos;</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const val = Math.min(130, localMinute + 1);
                  setLocalMinute(val);
                  setIsDirty(true);
                  onUpdateMinute?.(val);
                }}
                disabled={localMinute >= 130}
                className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-black font-black flex items-center justify-center cursor-pointer text-xs"
              >
                +
              </button>
            </div>

            {/* Auto Clock Switch Button */}
            <button
              type="button"
              onClick={() => onToggleMatchClock?.(!isClockRunning)}
              className={`w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 ${
                isClockRunning
                  ? 'bg-amber-400 hover:bg-amber-300 text-black border border-amber-200'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black border border-emerald-300'
              }`}
            >
              {isClockRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-black" />}
              <span>{isClockRunning ? '⏸ Pausar Reloj Automático' : '▶ Iniciar Reloj Automático'}</span>
            </button>
          </div>

          {/* Away Team Stepper */}
          <div className="p-4 rounded-xl bg-[#0a0f1d] border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{awayClub.badgeEmoji || '⚽'}</span>
              <div>
                <span className="text-xs font-bold text-white block truncate max-w-[120px] sm:max-w-[150px]">
                  {awayClub.name}
                </span>
                <span className="text-[10px] text-amber-400 font-semibold">Visitante</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const val = Math.max(0, localAwayScore - 1);
                  setLocalAwayScore(val);
                  setIsDirty(true);
                  onUpdateScore?.(localHomeScore, val);
                }}
                disabled={localAwayScore <= 0}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-750 disabled:opacity-30 text-white font-bold flex items-center justify-center cursor-pointer transition text-base"
              >
                -
              </button>
              <input
                type="number"
                min={0}
                max={50}
                value={localAwayScore}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    const clamped = Math.max(0, Math.min(50, val));
                    setLocalAwayScore(clamped);
                    setIsDirty(true);
                    onUpdateScore?.(localHomeScore, clamped);
                  }
                }}
                className="w-12 h-9 text-center bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-lg font-mono text-xl font-black text-white tabular-nums focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const val = Math.min(50, localAwayScore + 1);
                  setLocalAwayScore(val);
                  setIsDirty(true);
                  onUpdateScore?.(localHomeScore, val);
                }}
                disabled={localAwayScore >= 50}
                className="w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-black font-black flex items-center justify-center cursor-pointer transition text-base shadow-sm"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Periods & Quick Operator Actions */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Período:</span>
            {(['1T', 'Descanso', '2T', 'Tiempo Extra', 'Revisión VAR', 'Finalizado'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handlePeriodChange(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  period === p
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setLocalMinute(1);
                handlePeriodChange('1T');
                onUpdateMinute?.(1);
                onToggleMatchClock?.(true);
              }}
              className="px-2 py-1 rounded-lg bg-slate-850 hover:bg-slate-800 text-[11px] font-mono text-slate-200 border border-slate-750 cursor-pointer"
            >
              1&apos; Arrancar
            </button>
            <button
              type="button"
              onClick={() => {
                setLocalMinute(45);
                handlePeriodChange('Descanso');
                onUpdateMinute?.(45);
                onToggleMatchClock?.(false);
              }}
              className="px-2 py-1 rounded-lg bg-slate-850 hover:bg-slate-800 text-[11px] font-mono text-amber-300 border border-slate-750 cursor-pointer"
            >
              45&apos; Entretiempo
            </button>
            <button
              type="button"
              onClick={() => {
                handlePeriodChange('Revisión VAR');
              }}
              className="px-2 py-1 rounded-lg bg-slate-850 hover:bg-slate-800 text-[11px] font-mono text-purple-300 border border-purple-500/30 cursor-pointer"
            >
              🔍 VAR
            </button>
            <button
              type="button"
              onClick={() => {
                setLocalMinute(46);
                handlePeriodChange('2T');
                onUpdateMinute?.(46);
                onToggleMatchClock?.(true);
              }}
              className="px-2 py-1 rounded-lg bg-slate-850 hover:bg-slate-800 text-[11px] font-mono text-slate-200 border border-slate-750 cursor-pointer"
            >
              46&apos; Inicio 2T
            </button>
            <button
              type="button"
              onClick={() => {
                setLocalMinute(90);
                handlePeriodChange('Finalizado');
                onUpdateMinute?.(90);
                onToggleMatchClock?.(false);
              }}
              className="px-2 py-1 rounded-lg bg-slate-850 hover:bg-slate-800 text-[11px] font-mono text-red-300 border border-slate-750 cursor-pointer"
            >
              90&apos; Finalizar
            </button>
          </div>
        </div>
      </div>

      {/* Se eliminó el formulario duplicado de equipos, título, torneo y API.
          El marcador inferior es el único editor visual de goles y minuto.
          La configuración de las tres señales permanece en el panel de transmisión. */}
      <div className="space-y-4">
        {/* SECCIÓN LIMPIEZA Y REINICIO DE PARTIDO (EVENTOS Y CHAT) */}
        {(onClearEvents || onClearChat) && (
          <div className="bg-[#0a0f1d] border border-red-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                  Limpieza y Reinicio para Nuevo Partido
                </h3>
                <p className="text-xs text-slate-400">
                  Limpia la cronología de eventos anteriores y los mensajes del chat antes de arrancar un nuevo partido.
                </p>
              </div>
            </div>

            {clearActionFeedback && (
              <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{clearActionFeedback}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {onClearEvents && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('¿Estás seguro de que deseas limpiar todos los eventos (goles, tarjetas, cambios) de la cronología para el nuevo partido?')) {
                      onClearEvents();
                      setClearActionFeedback('¡Cronología de eventos vaciada exitosamente!');
                      setTimeout(() => setClearActionFeedback(null), 4000);
                    }
                  }}
                  className="p-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-200 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>Limpiar Cronología de Eventos ({events.length})</span>
                </button>
              )}

              {onClearChat && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('¿Estás seguro de que deseas limpiar todos los mensajes del chat en vivo para el nuevo partido?')) {
                      onClearChat();
                      setClearActionFeedback('¡Chat en vivo limpiado exitosamente para todos los usuarios!');
                      setTimeout(() => setClearActionFeedback(null), 4000);
                    }
                  }}
                  className="p-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Limpiar Mensajes del Chat en Vivo</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
