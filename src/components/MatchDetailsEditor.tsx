import { FOOTBALL_LEAGUES, clubNameKey } from '../data/footballLeagues';
import { ClubCrest } from './ClubCrest';
import React, { useState, useEffect, useRef } from 'react';
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
import { iptvService } from '../services/iptvService';
import { ExternalPlayer } from '../features/player/ExternalPlayer';
import { normalizeMatchIptvUrl, normalizeExternalPlayerUrl } from '../utils/streamUtils';
import { normalizeChannelSource } from '../utils/channelSources';
import type { IptvChannel } from '../types/iptv';
import type { MatchIptvSource, StreamProvider } from '../types/football';
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
  onDeleteEvent?: (eventId: string) => Promise<void> | void;
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
  const { clubs, saveClub } = useClubs();
  const clubKeys = Object.keys(clubs);
  const defaultHomeClubId = activeEvent?.homeTeam || streamSettings?.homeClubId || clubKeys[0] || 'bolivar';
  const defaultAwayClubId = activeEvent?.awayTeam || streamSettings?.awayClubId || clubKeys[1] || 'strongest';

  // Internal form fields
  const [title, setTitle] = useState(activeEvent?.title || streamSettings?.title || '');
  const [tournamentName, setTournamentName] = useState(activeEvent?.tournamentName || streamSettings?.tournamentName || '');
  const [homeClubId, setHomeClubId] = useState(defaultHomeClubId);
  const [awayClubId, setAwayClubId] = useState(defaultAwayClubId);
  const [stadiumName, setStadiumName] = useState(activeEvent?.stadiumName || streamSettings?.stadiumName || '');
  const [altitudeMeters, setAltitudeMeters] = useState(streamSettings?.altitudeMeters || 0);
  const [officialAnnouncement, setOfficialAnnouncement] = useState(streamSettings?.officialAnnouncement || '');
  const [isLiveMatch, setIsLiveMatch] = useState<boolean>(activeEvent?.isLive ?? streamSettings?.isLive ?? true);
  const [period, setPeriod] = useState<MatchPeriod>((activeEvent?.period as MatchPeriod) || streamSettings?.period || '1T');

  // Local score & minute state for responsive, rock-solid editing
  const [localHomeScore, setLocalHomeScore] = useState<number>(activeEvent?.homeScore ?? homeScore);
  const [localAwayScore, setLocalAwayScore] = useState<number>(activeEvent?.awayScore ?? awayScore);
  const [localMinute, setLocalMinute] = useState<number>(activeEvent?.matchMinute ?? matchMinute);

  const [broadcastMode, setBroadcastMode] = useState<string>(activeEvent?.broadcastMode || 'obs_custom');
  const [iptvChannels, setIptvChannels] = useState<IptvChannel[]>([]);
  const [iptvLoading, setIptvLoading] = useState(false);
  const [iptvSource, setIptvSource] = useState<MatchIptvSource | undefined>(activeEvent?.iptvSource || undefined);
  const [matchPrimaryProvider, setMatchPrimaryProvider] = useState<StreamProvider>(activeEvent?.primaryProvider || 'cloudflare');
  const [matchFallbackOrder, setMatchFallbackOrder] = useState<StreamProvider[]>(activeEvent?.fallbackOrder || ['cloudflare', 'youtube', 'kick']);
  const [externalUrl, setExternalUrl] = useState(activeEvent?.externalSource?.url || '');
  const [externalPreview, setExternalPreview] = useState('');
  const [matchActiveSource, setMatchActiveSource] = useState(activeEvent?.activeStreamSource || 'obs');
  const [iptvSearch, setIptvSearch] = useState('');
  useEffect(() => {
    let cancelled = false;
    setIptvLoading(true);
    Promise.allSettled([
      iptvService.getChannels({ forceRefresh: true }),
      iptvService.getCustomChannels(),
    ])
      .then(([channelsRes, customRes]) => {
        if (cancelled) return;
        const all = channelsRes.status === 'fulfilled' ? channelsRes.value : [];
        const custom = customRes.status === 'fulfilled' ? customRes.value : [];
        const customIds = new Set(custom.map((c) => c.id));
        const customUrls = new Set(custom.map((c) => c.streamUrl));
        const nonCustom = all.filter((c) => !customIds.has(c.id) && !customUrls.has(c.streamUrl));
        setIptvChannels([...custom, ...nonCustom]);
      })
      .catch(() => {
        if (!cancelled) setErrorMsg('No se pudo cargar el catálogo IPTV. Comprueba la conexión y vuelve a abrir el editor.');
      })
      .finally(() => {
        if (!cancelled) setIptvLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const selectIptvChannel = (channel: IptvChannel) => {
    const external = normalizeExternalPlayerUrl(channel.streamUrl);
    if (external) {
      setMatchActiveSource('obs');
      setBroadcastMode('obs_custom');
      setExternalUrl(external);
      setExternalPreview('');
      setMatchPrimaryProvider('external');
      setMatchFallbackOrder((prev) => ['external', ...prev.filter((p) => p !== 'external')]);
      setIptvSource({ channelId: channel.id, channelName: channel.name, streamUrl: external, sourceType: 'iframe', category: channel.group });
      setErrorMsg(null);
      setIsDirty(true);
      return;
    }
    const streamUrl = normalizeMatchIptvUrl(channel.streamUrl);
    if (!streamUrl) {
      setErrorMsg('Este canal no tiene una URL HLS (.m3u8) HTTP o HTTPS compatible. No se admiten páginas web ni otros formatos de vídeo.');
      return;
    }
    setMatchActiveSource('obs');
    setBroadcastMode('obs_custom');
    setIptvSource({ channelId: channel.id, channelName: channel.name, streamUrl, sourceType: 'hls', category: channel.group });
    setMatchPrimaryProvider('iptv');
    setMatchFallbackOrder((prev) => ['iptv', ...prev.filter((p) => p !== 'iptv')]);
    setErrorMsg(null);
    setIsDirty(true);
  };
  const removeIptvChannel = () => {
    setIptvSource(undefined);
    setExternalUrl('');
    setExternalPreview('');
    setMatchPrimaryProvider((p) => (p === 'iptv' || p === 'external') ? 'cloudflare' : p);
    setMatchFallbackOrder((prev) => prev.filter((p) => p !== 'iptv' && p !== 'external'));
    setIsDirty(true);
  };

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const prevEventIdRef = useRef(activeEventId);
  const syncedEventRef = useRef(activeEvent);

  // Cargar otro partido o una confirmación nueva sin sobrescribir cambios pendientes.
  useEffect(() => {
    if (prevEventIdRef.current !== activeEventId || (!isDirty && !isSaving && activeEvent && syncedEventRef.current !== activeEvent)) {
      syncedEventRef.current = activeEvent;
      prevEventIdRef.current = activeEventId;
      setIsDirty(false);
      const srcTitle = activeEvent?.title || streamSettings?.title || '';
      const srcTourn = activeEvent?.tournamentName || streamSettings?.tournamentName || '';
      const srcHome = activeEvent?.homeTeam || streamSettings?.homeClubId || defaultHomeClubId;
      const srcAway = activeEvent?.awayTeam || streamSettings?.awayClubId || defaultAwayClubId;
      const srcStadium = activeEvent?.stadiumName || streamSettings?.stadiumName || '';
      const srcPeriod = (activeEvent?.period || streamSettings?.period || '1T') as MatchPeriod;
      const srcIsLive = activeEvent?.isLive ?? streamSettings?.isLive ?? true;

      setEspnLink(activeEvent?.espnLink);
      setTitle(srcTitle);
      setTournamentName(srcTourn);
      setHomeClubId(srcHome);
      setAwayClubId(srcAway);
      setStadiumName(srcStadium);
      setPeriod(srcPeriod);
      setIsLiveMatch(srcIsLive);
      setMatchActiveSource(activeEvent?.activeStreamSource || 'obs');
      setBroadcastMode(activeEvent?.broadcastMode || 'obs_custom');
      setIptvSource(activeEvent?.iptvSource || undefined);
      setExternalUrl(activeEvent?.externalSource?.url || '');
      setExternalPreview('');
      setMatchPrimaryProvider(activeEvent?.primaryProvider || 'cloudflare');
      setMatchFallbackOrder(activeEvent?.fallbackOrder || ['cloudflare', 'youtube', 'kick']);
      setLocalHomeScore(activeEvent?.homeScore ?? homeScore);
      setLocalAwayScore(activeEvent?.awayScore ?? awayScore);
      setLocalMinute(activeEvent?.matchMinute ?? matchMinute);
    }
  }, [activeEventId, activeEvent, streamSettings, defaultHomeClubId, defaultAwayClubId, homeScore, awayScore, matchMinute, isDirty, isSaving]);

  // Free Football API (ESPN) state
  const [espnLink, setEspnLink] = useState<LiveEvent['espnLink']>(activeEvent?.espnLink);
  const [isImportingApi, setIsImportingApi] = useState(false);
  const [apiLeague, setApiLeague] = useState<string>('bol.1');
  const [apiMatches, setApiMatches] = useState<ApiMatchSummary[]>([]);
  const [isLoadingApiMatches, setIsLoadingApiMatches] = useState<boolean>(false);
  const [selectedApiMatchId, setSelectedApiMatchId] = useState<string>('');
  const apiRequestRef = useRef(0);
  const [apiFeedback, setApiFeedback] = useState<string | null>(null);
  const [clearActionFeedback, setClearActionFeedback] = useState<string | null>(null);

  const handleLoadApiMatches = async () => {
    const requestId = ++apiRequestRef.current;
    setIsLoadingApiMatches(true);
    setApiFeedback(null);
    try {
      const matches = await espnFootballApi.getMatches(apiLeague);
      if (requestId !== apiRequestRef.current) return;
      setApiMatches(matches);
      if (matches.length > 0) {
        setSelectedApiMatchId(matches[0].id);
        setApiFeedback(`¡Se encontraron ${matches.length} partidos oficiales en la API de ESPN!`);
      } else {
        setApiFeedback('No hay partidos programados en este momento para la liga seleccionada.');
      }
    } catch {
      if (requestId === apiRequestRef.current) setApiFeedback('No se pudo conectar con la API deportiva.');
    } finally {
      if (requestId === apiRequestRef.current) setIsLoadingApiMatches(false);
      setTimeout(() => setApiFeedback(null), 5000);
    }
  };

  const handleImportSelectedApiMatch = async () => {
    const match = apiMatches.find(m => m.id === selectedApiMatchId);
    if (!match) return;
    const targetEvent = activeEventId;
    setIsImportingApi(true);
    try {
      const resolveTeam = async (team: ApiMatchSummary['homeTeam']) => {
        const existing = Object.values(clubs).find(c => clubNameKey(c.name) === clubNameKey(team.displayName) || clubNameKey(c.shortName) === clubNameKey(team.displayName));
        if (existing) return existing.id;
        if (!team.id) throw new Error('ESPN no devolvió un identificador de equipo.');
        const league = FOOTBALL_LEAGUES[apiLeague];
        const domestic = league.includes(' (');
        const id = `espn_${team.id}`;
        await saveClub({ id, name: team.displayName, shortName: team.name, logoUrl: team.logo || '', league: domestic ? league : `Internacionales · ${league}`, country: domestic ? league.split(' (')[0] : '', city: '', stadium: '', altitudeMeters: 0, primaryColor: '#334155', secondaryColor: '#ffffff', textColor: '#ffffff', badgeEmoji: '' });
        return id;
      };
      const homeId = await resolveTeam(match.homeTeam);
      const awayId = await resolveTeam(match.awayTeam);
      if (prevEventIdRef.current !== targetEvent) return;
      setHomeClubId(homeId); setAwayClubId(awayId);
      setTitle(`${match.homeTeam.displayName} vs ${match.awayTeam.displayName}`);
      setTournamentName(FOOTBALL_LEAGUES[apiLeague]);
      if (match.venue) setStadiumName(match.venue);
      setLocalHomeScore(match.homeTeam.score); setLocalAwayScore(match.awayTeam.score);
      setLocalMinute(match.minute || 0);
      setPeriod(match.liveState?.period || '1T');
      setBroadcastMode(match.liveState?.broadcastMode || 'pre_match');
      setIsLiveMatch(match.isLive);
      setEspnLink({ eventId: match.id, league: apiLeague, enabled: true });
      setIsDirty(true);
      setApiFeedback('Partido vinculado a ESPN. Guarda el formulario para activar la actualización automática de marcador, minutos y estado.');
    } catch (error) { setApiFeedback(error instanceof Error ? error.message : 'No se pudieron importar los equipos.'); }
    finally { setIsImportingApi(false); }
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
    const newId = `partido-${String(nextNum).padStart(3, '0')}-${Date.now().toString(36)}`;

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
    const currentId = targetId || activeEventId || activeEvent?.id;
    if (!currentId) { setErrorMsg('Selecciona un partido válido antes de eliminarlo.'); return; }
    const targetEvt = liveEvents.find((e) => e.id === currentId);
    const targetTitle = targetEvt?.title || title || 'este partido';

    if (!confirm(`¿Estás seguro de eliminar el partido "${targetTitle}"?`)) return;

    setIsSaving(true);
    setErrorMsg(null);
    try {
      if (onDeleteEvent) await onDeleteEvent(currentId);
      else await apiClient.deleteLiveEvent(currentId);
      const remaining = liveEvents.filter((e) => e.id !== currentId);
      if (remaining.length > 0) {
        onSelectEvent?.(remaining[0].id);
      } else {
        setTitle('');
        setTournamentName('');
        setStadiumName('');
        setPeriod('1T');
        setLocalHomeScore(0);
        setLocalAwayScore(0);
        setLocalMinute(0);
        setExternalUrl('');
        setExternalPreview('');
        setIptvSource(undefined);
        setIsDirty(false);
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
    isLiveMatch, period, localHomeScore, localAwayScore, localMinute, externalUrl, matchPrimaryProvider, matchFallbackOrder, iptvSource, broadcastMode, matchActiveSource,
  ]);
  const formKeyRef = useRef(formKey);
  formKeyRef.current = formKey;

  const handleSubmit = async (e?: React.FormEvent): Promise<boolean> => {
    if (e) e.preventDefault();
    if ((externalUrl.trim() || matchPrimaryProvider === 'external') && !normalizeExternalPlayerUrl(externalUrl)) {
      setErrorMsg('Introduce una URL válida de reproductor externo o selecciona otra señal principal.');
      return false;
    }
    const savedFormKey = formKeyRef.current;
    setErrorMsg(null);
    setSaveSuccess(false);

    const cleanTitle = title.trim();
    const cleanTournament = tournamentName.trim();
    const cleanStadium = stadiumName.trim();
    const effectiveHomeId = (homeClubId || defaultHomeClubId).trim().toLowerCase();
    const effectiveAwayId = (awayClubId || defaultAwayClubId).trim().toLowerCase();
    const alt = Number(altitudeMeters);

    // Validations
    if (!cleanTitle || cleanTitle.length < 3) {
      setErrorMsg('El título del partido debe tener al menos 3 caracteres.');
      return false;
    }
    if (!effectiveHomeId || !effectiveAwayId) {
      setErrorMsg('Debes seleccionar un club local y un club visitante.');
      return false;
    }
    if (effectiveHomeId === effectiveAwayId) {
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
    const preservedPrimaryProvider = matchPrimaryProvider;

    const fullEventPayload: LiveEvent = {
      id: activeId,
      espnLink: espnLink || null,
      title: cleanTitle,
      homeTeam: effectiveHomeId,
      awayTeam: effectiveAwayId,
      tournamentName: cleanTournament || 'Liga Tigo División Profesional',
      stadiumName: cleanStadium || 'Estadio Departamental',
      isLive: isLiveMatch,
      homeScore: localHomeScore,
      awayScore: localAwayScore,
      matchMinute: localMinute,
      period,
      primaryProvider: preservedPrimaryProvider,
      fallbackOrder: matchFallbackOrder,
      iptvSource: iptvSource || null,
      externalSource: normalizeExternalPlayerUrl(externalUrl) ? { url: normalizeExternalPlayerUrl(externalUrl)! } : null,
      cloudflare: preservedCloudflare,
      youtube: preservedYoutube,
      kick: preservedKick,
      customVideoUrl: preservedCustomVideoUrl,
      activeStreamSource: matchActiveSource,
      autoFailoverEnabled: currentEvt?.autoFailoverEnabled ?? streamSettings.autoFailoverEnabled ?? true,
      broadcastMode,
      isClockRunning,
      clockUpdatedAt: Date.now(),
      version: typeof currentEvt?.version === 'number' ? currentEvt.version : undefined,
      force: false,
    };

    try {
      // 1. Guardar partido completo en Firebase y Servidor (apiClient.saveLiveEvent)
      const confirmedEvent = await apiClient.saveLiveEvent(fullEventPayload);

      // Los datos oficiales de este partido se guardan por eventId; no actualizar la configuración global.
      if (onUpdateLiveEvent) {
        onUpdateLiveEvent(confirmedEvent);
      }

      if (savedFormKey === formKeyRef.current) {
        setIsDirty(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 5000);
      }
      return true;
    } catch (err: any) {
      console.error('[MatchDetailsEditor] Error al guardar partido y marcador:', err);
      setErrorMsg(err.message || 'Error al guardar los datos en el servidor.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

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

            {liveEvents.length > 0 && (
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
          {liveEvents.length === 0 ? (
            <span className="text-xs text-slate-400 italic py-1">No hay partidos creados en el sistema. Haz clic en "Crear Nuevo Partido" para agregar uno.</span>
          ) : (
            liveEvents.map((evt) => {
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
                </div>
              );
            })
          )}
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
              <span className="text-2xl"><ClubCrest club={homeClub} className="w-8 h-8" /></span>
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
              <span className="text-2xl"><ClubCrest club={awayClub} className="w-8 h-8" /></span>
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

      {/* 3. CONFIGURACIÓN DETALLADA DEL PARTIDO (DETAILS FORM) */}
      <div className="bg-[#0b1222] border-2 border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wide">
                Información del Partido y Equipos
              </h4>
              <p className="text-[11px] text-slate-400">
                Ajusta los clubes en cancha, estadio, torneo y título visible para los espectadores.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Derbies & International Matches */}
        <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <span>⚡</span>
              <span>Partidos Rápidos Preconfigurados:</span>
            </span>
            <span className="text-[10px] text-slate-500">Un clic para auto-llenar equipos y torneo</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {PRESET_INTERNATIONAL_MATCHES.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setHomeClubId(preset.homeTeam);
                  setAwayClubId(preset.awayTeam);
                  setTitle(preset.title);
                  setTournamentName(preset.tournament);
                  setStadiumName(preset.stadium);
                  setIsDirty(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 transition cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Título Oficial del Partido:</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateTitle}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generar con equipos</span>
              </button>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Ej: Bolívar vs The Strongest - Clásico Paceño"
              className="w-full bg-[#060a14] border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-semibold placeholder:text-slate-600 focus:outline-none"
              required
            />
          </div>

          {/* Row 2: Clubs Selection */}
          <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Selección de Clubes</span>
              </span>
              <button
                type="button"
                onClick={handleSwapClubs}
                className="text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ArrowLeftRight className="w-3 h-3 text-emerald-400" />
                <span>Invertir Local / Visitante</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Home Club */}
              <div>
                <label className="block text-[11px] font-semibold text-sky-400 mb-1">
                  Club Local:
                </label>
                <select
                  value={homeClubId}
                  onChange={(e) => {
                    setHomeClubId(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full bg-[#060a14] border border-sky-500/40 focus:border-sky-400 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none"
                >
                  {Object.entries(groupClubsByLeague(clubs)).map(([leagueTitle, leagueClubs]) => (
                    leagueClubs.length > 0 && (
                      <optgroup key={leagueTitle} label={leagueTitle}>
                        {leagueClubs.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.city})
                          </option>
                        ))}
                      </optgroup>
                    )
                  ))}
                </select>
              </div>

              {/* Away Club */}
              <div>
                <label className="block text-[11px] font-semibold text-amber-400 mb-1">
                  Club Visitante:
                </label>
                <select
                  value={awayClubId}
                  onChange={(e) => {
                    setAwayClubId(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full bg-[#060a14] border border-amber-500/40 focus:border-amber-400 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none"
                >
                  {Object.entries(groupClubsByLeague(clubs)).map(([leagueTitle, leagueClubs]) => (
                    leagueClubs.length > 0 && (
                      <optgroup key={leagueTitle} label={leagueTitle}>
                        {leagueClubs.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.city})
                          </option>
                        ))}
                      </optgroup>
                    )
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Row 3: Tournament */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white block">
              Torneo / Competencia:
            </label>
            <input
              type="text"
              value={tournamentName}
              onChange={(e) => {
                setTournamentName(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Ej: Liga Tigo División Profesional - Torneo Clausura"
              className="w-full bg-[#060a14] border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder:text-slate-600 focus:outline-none"
              required
            />
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-slate-500 font-medium">Sugeridos:</span>
              {TOURNAMENT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setTournamentName(preset);
                    setIsDirty(true);
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                    tournamentName === preset
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                      : 'bg-slate-900/60 text-slate-400 hover:text-white border-slate-800'
                  }`}
                >
                  {preset.split(' - ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Row 4: Stadium & Altitude */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Estadio y Sede del Encuentro:</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutofillStadiumFromHomeClub}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer underline"
                >
                  Usar estadio del local
                </button>
              </div>
              <input
                type="text"
                value={stadiumName}
                onChange={(e) => {
                  setStadiumName(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Ej: Estadio Hernando Siles - La Paz"
                className="w-full bg-[#060a14] border border-slate-750 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                <Mountain className="w-3.5 h-3.5 text-blue-400" />
                <span>Altitud (m s.n.m.):</span>
              </label>
              <input
                type="number"
                value={altitudeMeters}
                onChange={(e) => {
                  setAltitudeMeters(Number(e.target.value));
                  setIsDirty(true);
                }}
                placeholder="3637"
                className="w-full bg-[#060a14] border border-slate-750 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Row 5: Official Announcement */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Comunicado Oficial al Hincha:</span>
            </label>
            <input
              type="text"
              value={officialAnnouncement}
              onChange={(e) => {
                setOfficialAnnouncement(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Ej: Transmisión Oficial en HD para toda Bolivia por GolBolivia TV."
              className="w-full bg-[#060a14] border border-slate-750 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none"
            />
          </div>

          {/* Submit Action Button */}
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Haz clic en "GUARDAR DATOS" para registrar y publicar los cambios en vivo.</span>
              </span>
              {isDirty && (
                <span className="text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold">
                  Cambios pendientes de guardar
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/80 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>GUARDANDO PARTIDO Y MARCADOR EN FIREBASE...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-black" />
                  <span>GUARDAR DATOS DEL PARTIDO</span>
                </>
              )}
            </button>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 space-y-2">
            <label htmlFor="event-broadcast-mode" className="text-sm font-bold text-white">Modo de transmisión del partido</label>
            <select id="event-broadcast-mode" value={broadcastMode} onChange={(e) => { setBroadcastMode(e.target.value); setIsDirty(true); }} className="w-full bg-slate-950 text-white border border-slate-700 rounded-lg p-2">
              <option value="obs_custom">OBS / señal HLS</option>
              <option value="simulation">Simulación</option>
              <option value="pre_match">Previa del partido</option>
              <option value="halftime">Entretiempo</option>
              <option value="var">Revisión VAR</option>
              <option value="post_match">Postpartido</option>
            </select>
            <p className="text-xs text-slate-400">Este modo se guarda solo para el partido seleccionado. Las fuentes Cloudflare, YouTube y Kick se configuran por separado.</p>
          </div>
          <div className="rounded-xl border border-cyan-700/50 bg-slate-950 p-4 space-y-3">
            <h4 className="text-sm font-bold text-cyan-300">Señal IPTV temporal de este partido</h4>
            <p className="text-xs text-slate-400">Selecciona un canal existente; se guarda únicamente una copia de su referencia y URL en este partido. Al eliminar el partido se elimina la asociación, nunca el canal del catálogo. Usa solo señales autorizadas.</p>
            <input type="search" value={iptvSearch} onChange={(e) => setIptvSearch(e.target.value)} placeholder="Buscar canal por nombre o categoría" className="w-full bg-slate-900 text-white border border-slate-700 rounded-lg p-2 text-sm" />
            <select
              value={iptvSource?.channelId || ''}
              onChange={(e) => {
                const ch = iptvChannels.find((c) => c.id === e.target.value);
                if (ch) selectIptvChannel(ch);
              }}
              className="w-full bg-slate-900 text-white border border-slate-700 rounded-lg p-2 text-sm"
              disabled={iptvLoading}
            >
              <option value="">{iptvLoading ? 'Cargando catálogo IPTV...' : 'Seleccionar canal IPTV del catálogo'}</option>
              {iptvChannels
                .filter((ch) => (ch.name + ' ' + (ch.group || '')).toLowerCase().includes(iptvSearch.toLowerCase()))
                .slice(0, 300)
                .map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.name} — {ch.group || 'Sin categoría'} {ch.isCustom ? '⭐ (Admin)' : ''} {ch.sourceType === 'iframe' || normalizeExternalPlayerUrl(ch.streamUrl) ? '[Iframe]' : '[HLS]'}
                  </option>
                ))}
            </select>
            {iptvSource && (
              <div className="flex flex-wrap gap-2 items-center justify-between text-xs text-slate-300 bg-slate-900/90 p-2.5 rounded-lg border border-cyan-800/60">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>
                    Asignado: <strong className="text-white">{iptvSource.channelName}</strong> ({iptvSource.category || 'Sin categoría'})
                  </span>
                  {matchPrimaryProvider === 'external' ? (
                    <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono text-[10px] border border-cyan-600/60">
                      Iframe Externo
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-mono text-[10px] border border-amber-600/60">
                      Señal HLS (.m3u8)
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={removeIptvChannel}
                  className="border border-red-700/80 text-red-300 hover:bg-red-950/40 rounded-lg px-2.5 py-1 transition cursor-pointer"
                >
                  Quitar del partido
                </button>
              </div>
            )}
            <div className="space-y-2 border-t border-slate-700 pt-3">
              <label htmlFor="match-external-url" className="block text-sm font-bold text-cyan-300">Reproductor externo (iframe)</label>
              <p className="text-xs text-slate-400">Pega la URL HTTPS del reproductor o código &lt;iframe&gt;. Compatible con canales deportivos y reproductores autorizados (YouTube, Twitch, StreamXHD, PelotaLibre, etc.).</p>
              <input
                id="match-external-url"
                type="text"
                value={externalUrl}
                onChange={(e) => {
                  const val = e.target.value;
                  const normalized = normalizeChannelSource(val, 'iframe') || val.trim();
                  setExternalUrl(normalized);
                  setMatchActiveSource('obs');
                  setBroadcastMode('obs_custom');
                  setExternalPreview('');
                  setIsDirty(true);
                }}
                placeholder="https://... o <iframe src='...'></iframe>"
                className="w-full bg-slate-900 text-white border border-slate-700 rounded-lg p-2 text-sm"
              />
              {externalUrl && !normalizeExternalPlayerUrl(externalUrl) && (
                <p role="alert" className="text-xs text-red-300">
                  URL no compatible. Usa un enlace HTTPS de reproductor de los dominios indicados.
                </p>
              )}
              <button
                type="button"
                disabled={!normalizeExternalPlayerUrl(externalUrl)}
                onClick={() => setExternalPreview(normalizeExternalPlayerUrl(externalUrl) || '')}
                className="rounded-lg border border-cyan-600 px-3 py-2 text-xs text-cyan-200 disabled:opacity-40 cursor-pointer"
              >
                Probar antes de guardar
              </button>
              {externalPreview && (
                <>
                  <p className="text-xs text-amber-300">Comprueba vídeo y audio. Cargar el marco no confirma reproducción. La prueba no guarda cambios.</p>
                  <div className="aspect-video"><ExternalPlayer url={externalPreview} /></div>
                  <button type="button" onClick={() => setExternalPreview('')} className="text-xs text-slate-300 underline cursor-pointer">Cerrar prueba</button>
                </>
              )}
            </div>
            <label className="block text-xs text-slate-300" htmlFor="match-primary-provider">Señal principal de este partido</label>
            <select id="match-primary-provider" value={matchPrimaryProvider} onChange={(e) => { setMatchPrimaryProvider(e.target.value as StreamProvider); setIsDirty(true); }} className="w-full bg-slate-900 text-white border border-slate-700 rounded-lg p-2 text-sm">
              <option value="cloudflare">Cloudflare Stream</option><option value="youtube">YouTube</option><option value="kick">Kick</option>
              {normalizeExternalPlayerUrl(externalUrl) && <option value="external">Reproductor externo (iframe)</option>}
              {iptvSource && <option value="iptv">Canal IPTV: {iptvSource.channelName}</option>}
            </select>
            <label className="block text-xs text-slate-300" htmlFor="match-fallback-order">Orden de respaldo (primero a último)</label>
            <select id="match-fallback-order" value={matchFallbackOrder.join(',')} onChange={(e) => { setMatchFallbackOrder(e.target.value.split(',') as StreamProvider[]); setIsDirty(true); }} className="w-full bg-slate-900 text-white border border-slate-700 rounded-lg p-2 text-sm">
              {normalizeExternalPlayerUrl(externalUrl) && <option value="external,iptv,cloudflare,youtube,kick">Externo → IPTV → Cloudflare → YouTube → Kick</option>}
              <option value="cloudflare,youtube,kick">Cloudflare → YouTube → Kick</option>
              <option value="youtube,kick,cloudflare">YouTube → Kick → Cloudflare</option>
              <option value="kick,cloudflare,youtube">Kick → Cloudflare → YouTube</option>
              {iptvSource && <option value="iptv,cloudflare,youtube,kick">IPTV → Cloudflare → YouTube → Kick</option>}
              {iptvSource && <option value="cloudflare,iptv,youtube,kick">Cloudflare → IPTV → YouTube → Kick</option>}
            </select>
            <p className="text-xs text-amber-300">La verificación real de segmentos y reproducción debe realizarse antes de publicar. El failover automático entre iframe y HLS todavía requiere pruebas.</p>
          </div>
          {/* Feedback Banners */}
          {saveSuccess && (
            <div className="p-3 bg-emerald-950/90 border border-emerald-500 rounded-xl text-xs text-emerald-200 flex items-center gap-2 shadow-lg animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>¡Partido y Marcador guardados con éxito!</strong> Los datos han sido registrados en Google Firebase Firestore y sincronizados en tiempo real sin alterar las señales de transmisión.
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-950/90 border border-red-500 rounded-xl text-xs text-red-200 flex items-center gap-2 shadow-lg animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </form>

        {/* SECCIÓN API GRATUITA DEL PARTIDO (ESPN FÚTBOL) */}
        <div className="bg-[#0a0f1d] border border-sky-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                  API Gratuita de Partidos, Alineaciones & Estadísticas
                </h3>
                <p className="text-xs text-slate-400">
                  Conexión directa con la API gratuita y abierta de ESPN para partidos del fútbol boliviano y torneos internacionales.
                </p>
              </div>
            </div>

            <span className="text-[10px] px-2.5 py-1 rounded-full font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 self-start sm:self-auto">
              API Gratuita Activa
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Torneo / Liga Oficial:
              </label>
              <select
                value={apiLeague}
                onChange={(e) => { apiRequestRef.current++; setIsLoadingApiMatches(false); setApiLeague(e.target.value); setApiMatches([]); setSelectedApiMatchId(''); }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                {Object.entries(FOOTBALL_LEAGUES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </div>

            <div>
              <button
                type="button"
                onClick={handleLoadApiMatches}
                disabled={isLoadingApiMatches}
                className="w-full py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingApiMatches ? 'animate-spin' : ''}`} />
                <span>{isLoadingApiMatches ? 'Buscando partidos...' : 'Consultar Partidos de Hoy'}</span>
              </button>
            </div>

            {apiMatches.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={handleImportSelectedApiMatch}
                  disabled={isImportingApi}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Importar al Formulario</span>
                </button>
              </div>
            )}
          </div>

          {espnLink && <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={espnLink.enabled} onChange={e => { setEspnLink({ ...espnLink, enabled: e.target.checked }); setIsDirty(true); }} /> Actualizar automáticamente con ESPN · {FOOTBALL_LEAGUES[espnLink.league]} · ID {espnLink.eventId}. Guarda para aplicar. Desactiva para editar el marcador manualmente.</label>}
          {apiMatches.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <label className="block text-xs font-semibold text-slate-300">
                Seleccionar Partido Encontrado en la API:
              </label>
              <select
                value={selectedApiMatchId}
                onChange={(e) => setSelectedApiMatchId(e.target.value)}
                className="w-full bg-[#070b14] border border-sky-500/40 rounded-xl px-3 py-2.5 text-xs text-white font-medium"
              >
                {apiMatches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.statusText} ({m.isLive ? '🔴 EN VIVO' : m.isFinished ? 'FINALIZADO' : 'PROGRAMADO'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {apiFeedback && (
            <div className="p-3 bg-sky-950/80 border border-sky-500/60 rounded-xl text-xs text-sky-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
              <span>{apiFeedback}</span>
            </div>
          )}
        </div>

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
