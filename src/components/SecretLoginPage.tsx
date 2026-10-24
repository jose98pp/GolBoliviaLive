import { buildEventSourcesPatch, getEventSources, getDefaultSourceId } from '../utils/eventSources';
import { EventSourcesManager } from './EventSourcesManager';
import { MatchAudiencePanel } from './MatchAudiencePanel';
import React, { useState } from 'react';
import {
  Lock,
  Shield,
  Eye,
  EyeOff,
  ArrowLeft,
  LogOut,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Tv,
  Radio,
  Sliders,
  Zap,
  Activity,
  MessageSquare,
  Clock,
  Video,
  CheckCircle2,
  Sparkles,
  Layers,
  Signal,
  MousePointerClick,
  Smartphone,
  Monitor,
  TrendingUp,
  Users,
  Cpu,
  ShieldCheck,
  HelpCircle,
  Crown,
  Trophy,
  Save,
  Database,
  Check,
  Heart,
  QrCode
} from 'lucide-react';
import { AdminVipManagement } from './AdminVipManagement';
import { MediaMtxGuideModal } from './MediaMtxGuideModal';
import { EventsAndChatModeration } from './EventsAndChatModeration';
import { authService, AuthUser, UserRole } from '../services/auth';
import { apiClient } from '../services/apiClient';
import { StreamSettings, MatchEvent, LiveEvent, LivePoll, NotificationItem, PrivateIngestCredentials, StreamProvider } from '../types/football';
import { BOLIVIAN_CLUBS } from '../data/bolivianFootballData';
import { RealPresenceStats } from '../hooks/useRealPresence';
import { MatchDetailsEditor } from './MatchDetailsEditor';
import { TeamsManager } from './TeamsManager';
import { LiveEventsManager } from './LiveEventsManager';
import { DonationQrAdminCard } from './DonationQrAdminCard';
import { IptvChannelsManager } from './IptvChannelsManager';
import { normalizeExternalPlayerUrl } from '../utils/streamUtils';
import { useClubs } from '../hooks/useClubs';

// ── Panel sections ──
type AdminTab = 'stream' | 'match' | 'teams' | 'events_chat' | 'vip_analytics' | 'qr_donations' | 'iptv_channels';
type AdminSection = 'live' | 'match' | 'settings';

const ADMIN_SECTIONS: { id: AdminSection; label: string; tabs: AdminTab[] }[] = [
  { id: 'live', label: 'En vivo', tabs: ['stream', 'events_chat', 'iptv_channels'] },
  { id: 'match', label: 'Eventos', tabs: ['match', 'teams'] },
  { id: 'settings', label: 'Ajustes', tabs: ['qr_donations', 'vip_analytics'] },
];

const ADMIN_TAB_LABELS: Record<AdminTab, string> = {
  stream: 'Señal',
  events_chat: 'Eventos y chat',
  iptv_channels: 'Canales IPTV',
  match: 'Marcador',
  teams: 'Equipos',
  qr_donations: 'QR Apóyame',
  vip_analytics: 'VIP y audiencia',
};

/** Mirrors the backend `requireRoles` checks so each role only sees the screens it can save. */
const ADMIN_TAB_ROLES: Record<AdminTab, UserRole[]> = {
  stream: ['ADMIN', 'TRANSMISOR'],
  events_chat: ['ADMIN', 'TRANSMISOR', 'EDITOR', 'MODERADOR'],
  iptv_channels: ['ADMIN', 'TRANSMISOR', 'EDITOR'],
  match: ['ADMIN', 'TRANSMISOR', 'EDITOR'],
  teams: ['ADMIN', 'TRANSMISOR', 'EDITOR'],
  qr_donations: ['ADMIN', 'TRANSMISOR', 'EDITOR'],
  vip_analytics: ['ADMIN'],
};

const ADMIN_SECTION_ICONS: Record<AdminSection, React.ElementType> = { live: Radio, match: Trophy, settings: Sliders };

interface SecretLoginPageProps {
  streamSettings: StreamSettings;
  onUpdateStreamSettings: (newSettings: Partial<StreamSettings>) => void;
  homeScore: number;
  awayScore: number;
  matchMinute: number;
  onUpdateScore: (home: number, away: number) => void;
  onUpdateMinute: (minute: number) => void;
  onAddMatchEvent: (event: Omit<MatchEvent, 'id'>) => void;
  onDispatchPushNotification: (notification: NotificationItem) => void;
  onPostOfficialMessage: (text: string) => void;
  onUpdatePoll: (poll: LivePoll) => void;
  onClearChat: () => void;
  onClearEvents?: () => void;
  onDeleteLiveEvent?: (eventId: string) => void;
  events?: MatchEvent[];
  onReturnToPublic: () => void;
  presenceStats?: RealPresenceStats;
  activeEventId?: string;
  onUpdateLiveEvent?: (event: Partial<LiveEvent>) => void;
  liveEvents?: LiveEvent[];
  onSelectEvent?: (eventId: string) => void;
  isClockRunning?: boolean;
  onToggleMatchClock?: (running: boolean) => void;
  onUpdatePeriod?: (period: string) => void;
}

export const SecretLoginPage: React.FC<SecretLoginPageProps> = ({
  streamSettings,
  onUpdateStreamSettings,
  homeScore,
  awayScore,
  matchMinute,
  onUpdateScore,
  onUpdateMinute,
  onAddMatchEvent,
  onDispatchPushNotification,
  onPostOfficialMessage,
  onUpdatePoll,
  onClearChat,
  onClearEvents,
  onDeleteLiveEvent,
  events = [],
  onReturnToPublic,
  presenceStats,
  activeEventId,
  onUpdateLiveEvent,
  liveEvents,
  onSelectEvent,
  isClockRunning = false,
  onToggleMatchClock,
  onUpdatePeriod,
}) => {
  // The dashboard is only shown after the backend confirms the stored session (/api/auth/me).
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isVerifyingSession, setIsVerifyingSession] = useState<boolean>(() => !!authService.getToken());
  const [usernameInput, setUsernameInput] = useState<string>('admin');
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ingestCreds, setIngestCreds] = useState<PrivateIngestCredentials | null>(null);

  // Validate server session on component mount using authService
  React.useEffect(() => {
    let isMounted = true;
    authService.validateSession()
      .then((user) => {
        if (isMounted) {
          if (user) {
            setCurrentUser(user);
            setIsAuthenticated(true);
            try {
              sessionStorage.setItem('golbolivia_admin_view', '1');
            } catch {}
          } else {
            setIsAuthenticated(false);
            setCurrentUser(null);
            try {
              sessionStorage.removeItem('golbolivia_admin_view');
            } catch {}
          }
          setIsVerifyingSession(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsVerifyingSession(false);
        }
      });

    return () => { isMounted = false; };
  }, []);

  // Fetch confidential ingest keys when authenticated
  React.useEffect(() => {
    if (isAuthenticated && (currentUser?.role === 'ADMIN' || currentUser?.role === 'TRANSMISOR')) {
      apiClient.getPrivateIngestCredentials()
        .then((creds) => setIngestCreds(creds))
        .catch(() => {});
    }
  }, [isAuthenticated, currentUser?.role]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsVerifyingSession(true);

    try {
      const data = await authService.login(pinInput, usernameInput);
      setCurrentUser(data.user);
      setIsAuthenticated(true);
      try {
        sessionStorage.setItem('golbolivia_admin_view', '1');
      } catch {}
      setPinInput('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Credenciales inválidas. Acceso denegado por el servidor.');
      setIsAuthenticated(false);
    } finally {
      setIsVerifyingSession(false);
    }
  };

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem('golbolivia_admin_view');
      sessionStorage.removeItem('golbolivia_admin_tab');
    } catch {}
    await authService.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setIngestCreds(null);
    onReturnToPublic();
  };

  // Monitor iframe state
  const [previewKey, setPreviewKey] = useState(0);
  const [isRefreshingPreview, setIsRefreshingPreview] = useState(false);

  // Dynamic clubs management from Firebase & Backend
  const { clubs, saveClub, deleteClub } = useClubs();

  // Active section inside the private dashboard (Streamlined tabs with dedicated QR Apóyame console)
  const [activeTab, setActiveTabState] = useState<AdminTab>(() => {
    try {
      const saved = sessionStorage.getItem('golbolivia_admin_tab') as AdminTab;
      if (saved && (Object.keys(ADMIN_TAB_ROLES) as AdminTab[]).includes(saved)) {
        return saved;
      }
    } catch {}
    return 'stream';
  });

  const setActiveTab = (tab: AdminTab) => {
    setActiveTabState(tab);
    try {
      sessionStorage.setItem('golbolivia_admin_tab', tab);
    } catch {}
  };
  const allowedTabs = (Object.keys(ADMIN_TAB_ROLES) as AdminTab[]).filter(
    (tab) => !!currentUser && ADMIN_TAB_ROLES[tab].includes(currentUser.role)
  );
  const visibleSections = ADMIN_SECTIONS
    .map((section) => ({ ...section, tabs: section.tabs.filter((tab) => allowedTabs.includes(tab)) }))
    .filter((section) => section.tabs.length > 0);
  const effectiveTab: AdminTab = allowedTabs.includes(activeTab) ? activeTab : allowedTabs[0] ?? 'stream';
  const activeSection = visibleSections.find((section) => section.tabs.includes(effectiveTab));
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const [providerSaveFeedback, setProviderSaveFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const currentEvent = activeEventId ? liveEvents?.find((e) => e.id === activeEventId) : liveEvents?.[0];
  const currentHomeId = currentEvent?.homeTeam || streamSettings.homeClubId || 'bolivar';
  const currentAwayId = currentEvent?.awayTeam || streamSettings.awayClubId || 'strongest';
  const homeClub = clubs[currentHomeId] || BOLIVIAN_CLUBS[currentHomeId] || BOLIVIAN_CLUBS.bolivar;
  const awayClub = clubs[currentAwayId] || BOLIVIAN_CLUBS[currentAwayId] || BOLIVIAN_CLUBS.strongest;

  // Auto-guardado inmediato y atómico del LiveEvent activo (servidor + Firestore) cada vez que el operador
  // cambia el proveedor principal o los canales en la pestaña 1 (Transmisión).
  const persistActiveLiveEvent = async (
    patch: Partial<LiveEvent>,
    feedbackSuffix?: string,
    throwOnFailure = false
  ): Promise<LiveEvent | null> => {
    const target = currentEvent;
    if (!target) return null;


    try {
      const payload: LiveEvent & { force?: boolean } = {
        ...target,
        ...patch,
        homeScore: typeof (patch.homeScore ?? target.homeScore) === 'number' ? (patch.homeScore ?? target.homeScore) : homeScore,
        awayScore: typeof (patch.awayScore ?? target.awayScore) === 'number' ? (patch.awayScore ?? target.awayScore) : awayScore,
        matchMinute: typeof (patch.matchMinute ?? target.matchMinute) === 'number' ? (patch.matchMinute ?? target.matchMinute) : matchMinute,
        period: patch.period || target.period || streamSettings.period || '1T',
        // Guardado PROTEGIDO: sin force (queda en false) para que el servidor rechace con 409 si esta
        // versión local es anterior a la confirmada en Firestore — nunca se sobrescribe data más reciente.
        version: typeof target.version === 'number' ? target.version : undefined,
        // Marca temporal fresca: evita falsos conflictos de timestamp con versiones idénticas
        updatedAt: Date.now(),
      };
      const saved = await apiClient.saveLiveEvent(payload);
      // Sincronizar la versión confirmada para reflejar el guardado y evitar conflictos
      if (onUpdateLiveEvent) onUpdateLiveEvent(saved);
      setProviderSaveFeedback({
        ok: true,
        text: feedbackSuffix
          ? `Guardado automático: ${feedbackSuffix}`
          : `Partido «${saved.title}» guardado en Firestore (v${saved.version || 1}).`,
      });
      window.setTimeout(() => setProviderSaveFeedback(null), 5000);
      return saved;
    } catch (err: any) {
      setProviderSaveFeedback({ ok: false, text: err.message || 'No se pudo guardar el partido activo en el servidor.' });
      if (throwOnFailure) throw err;
      return null;
    }
  };

  const handleReloadPreview = () => {
    setIsRefreshingPreview(true);
    setPreviewKey((prev) => prev + 1);
    setTimeout(() => setIsRefreshingPreview(false), 600);
  };

  const handleSetMode = (mode: StreamSettings['broadcastMode']) => {
    onUpdateStreamSettings({ broadcastMode: mode });
    // Trigger preview reload to immediately reflect the switch
    setTimeout(() => setPreviewKey((prev) => prev + 1), 100);
  };

  // If authenticated, render centralized dashboard & control center
  if (isAuthenticated) {
    const currentMode = streamSettings.broadcastMode || (streamSettings.customVideoUrl ? 'obs_custom' : 'simulation');

    return (
      <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
        {/* Master Command Header Bar */}
        <header className="sticky top-0 z-40 bg-[#0a0f1d]/95 backdrop-blur-md border-b border-amber-500/30 px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-950/40">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-white font-display tracking-wide">
                  GOLBOLIVIA LIVE · CONSOLA MAESTRA
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold tracking-wider uppercase flex items-center gap-1 ${
                    streamSettings.isLive
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${streamSettings.isLive ? 'bg-red-500' : 'bg-slate-500'}`} />
                  {streamSettings.isLive ? 'EN VIVO' : 'PAUSADO'}
                </span>
                {currentUser && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-black uppercase ${
                    currentUser.role === 'ADMIN'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : currentUser.role === 'TRANSMISOR'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : currentUser.role === 'MODERADOR'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    ROL: {currentUser.role}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400">
                Usuario: <strong className="text-amber-300">{currentUser?.name || 'Administrador General'}</strong> · Sesión Servidor Autenticada
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 font-semibold">v1.4.3</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">SHA: df267ec</span>
            </div>

            <button
              onClick={onReturnToPublic}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              title="Abrir vista tal como la ven los hinchas"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Ver Web Pública</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 rounded-xl bg-red-950/70 hover:bg-red-900/90 text-red-200 text-xs font-semibold flex items-center gap-1.5 border border-red-800/80 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </header>

        {/* ── Navegación: En vivo / Partido / Ajustes (según el rol) ── */}
        <div className="bg-[#090e1c] border-b border-slate-800/90 px-4 sm:px-6 py-2 flex items-center justify-between overflow-x-auto">
          <div className="flex items-center gap-2">
            {visibleSections.map((section) => {
              const Icon = ADMIN_SECTION_ICONS[section.id];
              const isActive = activeSection?.id === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveTab(section.tabs[0])}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{section.label}</span>
                </button>
              );
            })}

            {activeSection && activeSection.tabs.length > 1 && (
              <div className="flex items-center gap-1 pl-2 ml-1 border-l border-slate-800">
                {activeSection.tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      effectiveTab === tab ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-200'
                    }`}
                  >
                    {ADMIN_TAB_LABELS[tab]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden xl:flex items-center gap-2 text-xs text-slate-400 font-mono">
              {currentEvent?.sports ? <span>{currentEvent.sports.competition} · {currentEvent.sports.phase} {currentEvent.sports.clock}</span> : <>
              <span>Marcador: <strong className="text-white">{homeScore} - {awayScore}</strong></span>
              <span>·</span>
              <span>Minuto: <strong className="text-emerald-400">{matchMinute}&apos;</strong></span></>}
            </div>

          </div>
        </div>

        {/* Main Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
          {['ADMIN', 'TRANSMISOR', 'EDITOR'].includes(currentUser?.role || '') && <MatchAudiencePanel event={currentEvent} />}
          {effectiveTab === 'stream' ? (
            /* PESTAÑA 1: TRANSMISIÓN & SEÑALES M3U8 */
            <div className="space-y-6">
              <button type="button" className="text-sm text-cyan-300 underline" onClick={() => setIsGuideOpen(true)}>Guía OBS / MediaMTX y túnel Cloudflare</button>
              <EventSourcesManager key={currentEvent?.id || 'none'} event={currentEvent} onSave={async patch => {
                const saved = await persistActiveLiveEvent(patch, 'Fuentes del evento actualizadas.', true);
                if (!saved) throw new Error('Selecciona un evento antes de guardar sus fuentes.');
                return saved;
              }} />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* 1. MONITOR DE SALIDA EN TIEMPO REAL (IFRAME) */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-4 shadow-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                        <h2 className="text-xs font-bold text-white font-display tracking-wider uppercase flex items-center gap-1.5">
                          <span>Monitor de Salida en Vivo (Vista Espectador)</span>
                        </h2>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono font-bold">
                          PROGRAM 1080p
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleReloadPreview}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
                          title="Refrescar vista previa del reproductor"
                        >
                          <RefreshCw className={`w-3 h-3 ${isRefreshingPreview ? 'animate-spin text-amber-400' : ''}`} />
                          <span className="text-[11px]">Refrescar</span>
                        </button>
                        <a
                          href="/"
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1 border border-slate-700 transition-colors"
                          title="Abrir en pestaña nueva"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="text-[11px]">Pop-out</span>
                        </a>
                      </div>
                    </div>

                    {/* Iframe Live Output Player */}
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border-2 border-slate-700/80 shadow-2xl group">
                      <iframe
                        key={previewKey}
                        src="/?preview=1"
                        title="GolBolivia Live Output Monitor"
                        className="w-full h-full border-0 select-none bg-black"
                        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                      />

                      {/* Small Live Tag on Monitor */}
                      <div className="absolute top-2 left-2 pointer-events-none z-10 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-mono border border-slate-700 text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span>PREVIEW AIR</span>
                      </div>
                    </div>

                    {/* Live Stream Telemetry Under Monitor */}
                    <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                      <div className="bg-[#070b14] p-2 rounded-lg border border-slate-800/60">
                        <span className="text-slate-400 text-[10px] block">Modo de Señal</span>
                        <strong className="text-amber-400 capitalize">{currentMode.replace('_', ' ')}</strong>
                      </div>
                      <div className="bg-[#070b14] p-2 rounded-lg border border-slate-800/60">
                        <span className="text-slate-400 text-[10px] block">Marcador Actual</span>
                        <strong className="text-white">{homeClub.shortName} {homeScore} - {awayScore} {awayClub.shortName}</strong>
                      </div>
                      <div className="bg-[#070b14] p-2 rounded-lg border border-slate-800/60">
                        <span className="text-slate-400 text-[10px] block">Latencia Estimada</span>
                        <strong className="text-emerald-400">{streamSettings.lowLatencyMode ? '0.8s Ultra Baja' : '2.4s Normal'}</strong>
                      </div>
                      <div className="bg-[#070b14] p-2 rounded-lg border border-slate-800/60">
                        <span className="text-slate-400 text-[10px] block">Chat Oficial</span>
                        <strong className="text-blue-400 uppercase">{streamSettings.chatMode}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. PANEL DE INTERRUPTORES RÁPIDOS Y CONMUTADOR DE MODOS */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Master On-Air Switch */}
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      streamSettings.isLive
                        ? 'bg-gradient-to-r from-red-950/60 to-slate-900 border-red-600/60 shadow-lg shadow-red-950/40'
                        : 'bg-slate-900/90 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                          Interruptor Maestro de Emisión
                        </span>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${streamSettings.isLive ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`} />
                          <span>{streamSettings.isLive ? 'SEÑAL EN VIVO TRANSMITIENDO' : 'SEÑAL EN PAUSA / STANDBY'}</span>
                        </h3>
                      </div>

                      {/* Big Modern Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateStreamSettings({ isLive: !streamSettings.isLive });
                          setTimeout(() => setPreviewKey((prev) => prev + 1), 100);
                        }}
                        className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          streamSettings.isLive ? 'bg-red-600 shadow-md shadow-red-600/50' : 'bg-slate-700'
                        }`}
                        title="Alternar Emisión en Vivo"
                      >
                        <span
                          className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            streamSettings.isLive ? 'translate-x-8' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Panel de Modos de Transmisión (1-Click Switchers) */}
                  <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-white font-display tracking-wider uppercase flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-amber-400" />
                        <span>Modos de Señal de Transmisión</span>
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">Conmutación 1-Click</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Modo 1: OBS Custom Video */}
                      <button
                        onClick={() => handleSetMode('obs_custom')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          currentMode === 'obs_custom'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-md shadow-amber-950/40'
                            : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Video className="w-4 h-4 text-amber-400" />
                          {currentMode === 'obs_custom' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                        <span className="font-semibold text-xs text-white">Video OBS Studio</span>
                        <span className="text-[10px] text-slate-400 font-normal mt-0.5">Señal HLS / MP4 externa</span>
                      </button>

                      {/* Modo 2: Simulación Cancha */}
                      <button
                        onClick={() => handleSetMode('simulation')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          currentMode === 'simulation'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-md shadow-emerald-950/40'
                            : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Activity className="w-4 h-4 text-emerald-400" />
                          {currentMode === 'simulation' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <span className="font-semibold text-xs text-white">Cancha Táctica</span>
                        <span className="text-[10px] text-slate-400 font-normal mt-0.5">Simulación interactiva 2D</span>
                      </button>

                      {/* Modo 3: Placa Pre-Partido */}
                      <button
                        onClick={() => handleSetMode('pre_match')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          currentMode === 'pre_match'
                            ? 'bg-blue-500/20 border-blue-500 text-blue-300 font-bold shadow-md shadow-blue-950/40'
                            : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Clock className="w-4 h-4 text-blue-400" />
                          {currentMode === 'pre_match' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                        </div>
                        <span className="font-semibold text-xs text-white">Placa Pre-Partido</span>
                        <span className="text-[10px] text-slate-400 font-normal mt-0.5">Tarjeta de espera previa</span>
                      </button>

                      {/* Modo 4: Placa Entretiempo */}
                      <button
                        onClick={() => handleSetMode('halftime')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          currentMode === 'halftime'
                            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 font-bold shadow-md shadow-indigo-950/40'
                            : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Tv className="w-4 h-4 text-indigo-400" />
                          {currentMode === 'halftime' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                        </div>
                        <span className="font-semibold text-xs text-white">Entretiempo (1T)</span>
                        <span className="text-[10px] text-slate-400 font-normal mt-0.5">Resumen de descanso</span>
                      </button>

                      {/* Modo 5: Revisión VAR */}
                      <button
                        onClick={() => handleSetMode('var')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          currentMode === 'var'
                            ? 'bg-red-500/20 border-red-500 text-red-300 font-bold shadow-md shadow-red-950/40'
                            : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Zap className="w-4 h-4 text-red-400" />
                          {currentMode === 'var' && <CheckCircle2 className="w-3.5 h-3.5 text-red-400" />}
                        </div>
                        <span className="font-semibold text-xs text-white">Revisión VAR</span>
                        <span className="text-[10px] text-slate-400 font-normal mt-0.5">Alerta arbitral en vivo</span>
                      </button>

                      {/* Modo 6: Post-Partido */}
                      <button
                        onClick={() => handleSetMode('post_match')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          currentMode === 'post_match'
                            ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-bold shadow-md shadow-purple-950/40'
                            : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Sparkles className="w-4 h-4 text-purple-400" />
                          {currentMode === 'post_match' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                        </div>
                        <span className="font-semibold text-xs text-white">Fin de Partido</span>
                        <span className="text-[10px] text-slate-400 font-normal mt-0.5">Resultado final</span>
                      </button>
                    </div>
                  </div>

                  {/* Panel de Interruptores de Producción (Toggles On/Off) */}
                  <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3.5">
                    <h3 className="text-xs font-bold text-white font-display tracking-wider uppercase flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Interruptores Rápidos de Producción</span>
                    </h3>

                    <div className="space-y-3">
                      {/* Toggle 1: Marcador Oficial en Pantalla (Bug) */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                        <div>
                          <span className="text-xs font-semibold text-white block">Marcador TV en Pantalla</span>
                          <span className="text-[10px] text-slate-400">Mostrar bug oficial con goles y tiempo</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const current = streamSettings.overlayScoreboardVisible !== false;
                            onUpdateStreamSettings({ overlayScoreboardVisible: !current });
                            setTimeout(() => setPreviewKey((prev) => prev + 1), 100);
                          }}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                            streamSettings.overlayScoreboardVisible !== false ? 'bg-emerald-500' : 'bg-slate-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              streamSettings.overlayScoreboardVisible !== false ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Toggle 2: Modo de Baja Latencia */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                        <div>
                          <span className="text-xs font-semibold text-white block">Modo Ultra Baja Latencia</span>
                          <span className="text-[10px] text-slate-400">
                            {streamSettings.lowLatencyMode ? 'WebRTC 0.8s (Mínimo delay)' : 'Estándar 2.4s (Mayor buffer)'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateStreamSettings({ lowLatencyMode: !streamSettings.lowLatencyMode });
                            setTimeout(() => setPreviewKey((prev) => prev + 1), 100);
                          }}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                            streamSettings.lowLatencyMode ? 'bg-amber-500' : 'bg-slate-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              streamSettings.lowLatencyMode ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Toggle 3: Modo de Chat de Espectadores */}
                      <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white">Modo de Chat de Hinchas</span>
                          <span className="text-[10px] text-amber-400 font-mono capitalize">{streamSettings.chatMode}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                          <button
                            onClick={() => onUpdateStreamSettings({ chatMode: 'all' })}
                            className={`py-1.5 px-2 rounded-lg font-medium transition-colors cursor-pointer text-center ${
                              streamSettings.chatMode === 'all'
                                ? 'bg-emerald-500 text-black font-bold'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            Abierto
                          </button>
                          <button
                            onClick={() => onUpdateStreamSettings({ chatMode: 'subscribers' })}
                            className={`py-1.5 px-2 rounded-lg font-medium transition-colors cursor-pointer text-center ${
                              streamSettings.chatMode === 'subscribers'
                                ? 'bg-amber-500 text-black font-bold'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            Solo VIP
                          </button>
                          <button
                            onClick={() => onUpdateStreamSettings({ chatMode: 'muted' })}
                            className={`py-1.5 px-2 rounded-lg font-medium transition-colors cursor-pointer text-center ${
                              streamSettings.chatMode === 'muted'
                                ? 'bg-red-500 text-white font-bold'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            Silenciado
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : effectiveTab === 'match' ? (
            /* PESTAÑA 2: PARTIDO & MARCADOR (CENTRO OFICIAL DE PARTIDOS Y MARCADOR) */
            <div className="space-y-6">
              <MatchDetailsEditor
                streamSettings={streamSettings}
                onUpdateStreamSettings={onUpdateStreamSettings}
                activeEventId={activeEventId}
                activeEvent={currentEvent}
                onUpdateLiveEvent={onUpdateLiveEvent}
                liveEvents={liveEvents}
                onSelectEvent={onSelectEvent}
                onDeleteEvent={onDeleteLiveEvent}
                homeScore={homeScore}
                awayScore={awayScore}
                matchMinute={matchMinute}
                onUpdateScore={onUpdateScore}
                onUpdateMinute={onUpdateMinute}
                isClockRunning={isClockRunning}
                onToggleMatchClock={onToggleMatchClock}
                onUpdatePeriod={onUpdatePeriod}
                onClearEvents={onClearEvents}
                onClearChat={onClearChat}
                events={events}
              />
            </div>
          ) : effectiveTab === 'teams' ? (
            /* PESTAÑA 3: GESTIÓN DE EQUIPOS */
            <TeamsManager
              clubs={clubs}
              onSaveClub={saveClub}
              onDeleteClub={deleteClub}
              currentHomeClubId={streamSettings.homeClubId}
              currentAwayClubId={streamSettings.awayClubId}
            />
          ) : effectiveTab === 'events_chat' ? (
            /* PESTAÑA 4: EVENTOS DE LÍNEA DE TIEMPO & MODERACIÓN DE CHAT */
            <EventsAndChatModeration
              streamSettings={streamSettings}
              onUpdateStreamSettings={onUpdateStreamSettings}
              homeScore={homeScore}
              awayScore={awayScore}
              matchMinute={matchMinute}
              onUpdateScore={onUpdateScore}
              onAddMatchEvent={onAddMatchEvent}
              onDispatchPushNotification={onDispatchPushNotification}
              onPostOfficialMessage={onPostOfficialMessage}
              onUpdatePoll={onUpdatePoll}
              onClearChat={onClearChat}
              onClearEvents={onClearEvents}
              clubs={clubs}
            />
          ) : effectiveTab === 'vip_analytics' ? (
            /* PESTAÑA 5: SUSCRIPCIONES VIP & AUDIENCIA */
            <div className="space-y-6">
              <AdminVipManagement />
            </div>
          ) : effectiveTab === 'iptv_channels' ? (
            /* PESTAÑA CANALES IPTV: GESTIÓN DE SEÑALES IPTV Y CARGA DESDE DASHBOARD */
            <div className="space-y-6">
              <IptvChannelsManager
                assignedSourceUrls={getEventSources(currentEvent).map(source => source.url)}
                activeMatchStreamUrl={getEventSources(currentEvent).find(source => source.id === getDefaultSourceId(currentEvent))?.url}
                onSetMatchStreamUrl={async (streamUrl, channelName, sourceType, channel) => {
                  if (!currentEvent || !channel) throw new Error('Selecciona un partido activo antes de asignar una señal.');
                  const isExternal = sourceType === 'iframe' || Boolean(normalizeExternalPlayerUrl(streamUrl));
                  const sources = getEventSources(currentEvent);
                  const existing = sources.find(source => source.url === streamUrl);
                  const next = existing ? sources : [...sources, { id: crypto.randomUUID(), name: channelName, type: isExternal ? 'iframe' as const : 'hls' as const, url: streamUrl, channelId: channel.id }];
                  const initial = getDefaultSourceId(currentEvent) || next[0]?.id || '';
                  const saved = await persistActiveLiveEvent(buildEventSourcesPatch(next, initial), 'Canal añadido a las fuentes del evento.', true);
                  if (!saved) throw new Error('No se pudo guardar la señal del partido. Revisa el mensaje de error y vuelve a intentarlo.');
                }}
              />
            </div>
          ) : (
            /* PESTAÑA 6: GESTIÓN DEDICADA DEL CÓDIGO QR (BOTÓN APÓYAME) */
            <div className="space-y-6">
              <DonationQrAdminCard
                initialQr={streamSettings.donationQr}
                onQrUpdated={(newQr) => {
                  onUpdateStreamSettings({ donationQr: newQr });
                }}
              />
            </div>
          )}
        </main>

        {/* MediaMTX and OBS Guide Modal */}
        <MediaMtxGuideModal
          isOpen={isGuideOpen}
          onClose={() => setIsGuideOpen(false)}
        />
      </div>
    );
  }

  // If verifying an existing token in background, show minimal loader
  if (isVerifyingSession) {
    return (
      <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col justify-center items-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-2 border-amber-500/20 border-t-amber-400 rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-mono tracking-wider">Restaurando sesión segura...</span>
        </div>
      </div>
    );
  }

  // Not authenticated: render clean Login Box at /login
  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col justify-center items-center p-4">
      {/* Back button */}
      <div className="w-full max-w-md mb-4 flex justify-between items-center">
        <button
          onClick={onReturnToPublic}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" />
          <span>Volver a la transmisión pública</span>
        </button>
        <span className="text-[10px] text-slate-600 font-mono">Consola Confidencial</span>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-[#0a0f1d] border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 relative">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4 mx-auto shadow-lg shadow-amber-950/40">
          <Lock className="w-6 h-6" />
        </div>

        <div className="text-center mb-5">
          <h1 className="text-xl font-bold font-display text-white">Consola de Operaciones GolBolivia</h1>
          <p className="text-xs text-slate-400 mt-1">
            Autenticación segura en backend con control de roles (RBAC) y tokens de sesión.
          </p>
        </div>

        {/* Roles Quick Switcher */}
        <div className="mb-4">
          <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
            Seleccionar Rol de Operador:
          </label>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => { setUsernameInput('admin'); setPinInput(''); setErrorMsg(null); }}
              className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                usernameInput === 'admin'
                  ? 'bg-red-500/20 border-red-500 text-red-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="font-bold text-[11px]">ADMINISTRADOR</div>
              <div className="text-[10px] text-slate-500">Control total & VIP</div>
            </button>

            <button
              type="button"
              onClick={() => { setUsernameInput('transmisor'); setPinInput(''); setErrorMsg(null); }}
              className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                usernameInput === 'transmisor'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="font-bold text-[11px]">TRANSMISOR</div>
              <div className="text-[10px] text-slate-500">OBS, MediaMTX & Señal</div>
            </button>

            <button
              type="button"
              onClick={() => { setUsernameInput('moderador'); setPinInput(''); setErrorMsg(null); }}
              className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                usernameInput === 'moderador'
                  ? 'bg-blue-500/20 border-blue-500 text-blue-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="font-bold text-[11px]">MODERADOR</div>
              <div className="text-[10px] text-slate-500">Chat & mensajes</div>
            </button>

            <button
              type="button"
              onClick={() => { setUsernameInput('editor'); setPinInput(''); setErrorMsg(null); }}
              className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                usernameInput === 'editor'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="font-bold text-[11px]">EDITOR</div>
              <div className="text-[10px] text-slate-500">Marcador & Goles</div>
            </button>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Usuario de Sistema
            </label>
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
              placeholder="admin, transmisor, moderador, editor"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                PIN / Clave de Acceso (Validado en Servidor)
              </label>
            </div>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                maxLength={64}
                className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono tracking-widest text-slate-100 focus:outline-none focus:border-amber-500"
                placeholder="••••"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-950/70 border border-red-800/80 rounded-xl text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-amber-950/50 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
          >
            <ShieldCheck className="w-4 h-4 text-black" />
            <span>Verificar Credenciales en Servidor</span>
          </button>
        </form>

        <div className="mt-5 pt-3 border-t border-slate-800/80 text-center text-[10px] text-slate-500 space-y-1">
          <div>La sesión se valida mediante tokens HMAC emitidos exclusivamente por el servidor.</div>
          <div className="font-mono text-[9px] text-slate-400">Versión: v1.4.3 • Commit: df267ec • Salud: /api/health</div>
        </div>
      </div>
    </div>
  );
};
