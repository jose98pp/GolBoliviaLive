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
import { StreamSettings, MatchEvent, LiveEvent, LivePoll, NotificationItem, PrivateIngestCredentials } from '../types/football';
import { BOLIVIAN_CLUBS } from '../data/bolivianFootballData';
import { RealPresenceStats } from '../hooks/useRealPresence';
import { MatchDetailsEditor } from './MatchDetailsEditor';
import { TeamsManager } from './TeamsManager';
import { LiveEventsManager } from './LiveEventsManager';
import { DonationQrAdminCard } from './DonationQrAdminCard';
import { useClubs } from '../hooks/useClubs';
import { verifyStreamLatency, LatencyTestResult } from '../services/latencyChecker';

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
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => authService.isAuthenticated());
  const [isVerifyingSession, setIsVerifyingSession] = useState<boolean>(() => {
    // If we already have stored credentials, don't show loading blocker, render dashboard immediately!
    return !authService.isAuthenticated() && !!authService.getToken();
  });
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
          } else {
            setIsAuthenticated(false);
            setCurrentUser(null);
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
      setPinInput('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Credenciales inválidas. Acceso denegado por el servidor.');
      setIsAuthenticated(false);
    } finally {
      setIsVerifyingSession(false);
    }
  };

  const handleLogout = async () => {
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
  const [activeTab, setActiveTab] = useState<'stream' | 'match' | 'teams' | 'events_chat' | 'vip_analytics' | 'qr_donations'>('stream');
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Video stream URL input state
  const [videoUrlInput, setVideoUrlInput] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('golbolivia_custom_video_url') ||
        streamSettings.customVideoUrl ||
        'https://stuffed-january-bulk-self.trycloudflare.com/live/partido/index.m3u8'
      );
    } catch {
      return (
        streamSettings.customVideoUrl ||
        'https://stuffed-january-bulk-self.trycloudflare.com/live/partido/index.m3u8'
      );
    }
  });
  const [urlSaveSuccess, setUrlSaveSuccess] = useState<boolean>(false);
  const [urlSaveError, setUrlSaveError] = useState<string | null>(null);
  const [isSavingUrl, setIsSavingUrl] = useState<boolean>(false);

  // Sync if customVideoUrl changes externally
  React.useEffect(() => {
    if (streamSettings.customVideoUrl) {
      setVideoUrlInput(streamSettings.customVideoUrl);
      try {
        localStorage.setItem('golbolivia_custom_video_url', streamSettings.customVideoUrl);
      } catch {}
    }
  }, [streamSettings.customVideoUrl]);

  const handleSaveVideoUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingUrl(true);
    setUrlSaveError(null);

    let cleanUrl = videoUrlInput.trim();

    // Auto-fix: Cloudflare tunnels must use HTTPS to work on any mobile device or Smart TV without Mixed Content blocks
    if (cleanUrl.startsWith('http://') && (cleanUrl.includes('trycloudflare.com') || cleanUrl.includes('cloudflarestream.com'))) {
      cleanUrl = cleanUrl.replace('http://', 'https://');
      setVideoUrlInput(cleanUrl);
    }

    try {
      localStorage.setItem('golbolivia_custom_video_url', cleanUrl);
    } catch {}

    const payload = {
      customVideoUrl: cleanUrl,
      broadcastMode: cleanUrl ? ('obs_custom' as const) : ('simulation' as const),
      activeStreamSource: 'obs' as const,
      isLive: true,
    };

    onUpdateStreamSettings(payload);

    try {
      await apiClient.updateStreamSettings(payload);
      setUrlSaveSuccess(true);
      setPreviewKey((prev) => prev + 1);
      setTimeout(() => setUrlSaveSuccess(false), 5000);
    } catch (err: any) {
      console.error('Error al guardar señal en servidor:', err);
      setUrlSaveError(err.message || 'Error al conectar con el servidor.');
      setPreviewKey((prev) => prev + 1);
    } finally {
      setIsSavingUrl(false);
    }
  };

  const handleQuickPasteCloudflare = async () => {
    const cloudflareUrl = 'https://stuffed-january-bulk-self.trycloudflare.com/live/partido/index.m3u8';
    setVideoUrlInput(cloudflareUrl);
    try {
      localStorage.setItem('golbolivia_custom_video_url', cloudflareUrl);
    } catch {}

    const payload = {
      customVideoUrl: cloudflareUrl,
      broadcastMode: 'obs_custom' as const,
      activeStreamSource: 'obs' as const,
      isLive: true,
    };

    onUpdateStreamSettings(payload);
    try {
      await apiClient.updateStreamSettings(payload);
      setUrlSaveSuccess(true);
      setPreviewKey((prev) => prev + 1);
      setTimeout(() => setUrlSaveSuccess(false), 5000);
    } catch (err: any) {
      setUrlSaveError(err.message || 'Error al conectar con el servidor');
    }
  };

  const handleClearVideoUrl = async () => {
    setVideoUrlInput('');
    try {
      localStorage.removeItem('golbolivia_custom_video_url');
    } catch {}

    const payload = {
      customVideoUrl: '',
      broadcastMode: 'simulation' as const,
      activeStreamSource: 'simulation' as const,
    };

    onUpdateStreamSettings(payload);
    try {
      await apiClient.updateStreamSettings(payload);
    } catch {}
    setPreviewKey((prev) => prev + 1);
  };

  // Backup M3U8 URL state persisted in localStorage
  const [backupM3u8Input, setBackupM3u8Input] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('golbolivia_backup_m3u8_url') ||
        streamSettings.backupVideoUrl ||
        'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
      );
    } catch {
      return streamSettings.backupVideoUrl || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
    }
  });
  const [backupSaveSuccess, setBackupSaveSuccess] = useState<boolean>(false);

  // Sync if backupVideoUrl changes externally
  React.useEffect(() => {
    if (streamSettings.backupVideoUrl) {
      setBackupM3u8Input(streamSettings.backupVideoUrl);
      try {
        localStorage.setItem('golbolivia_backup_m3u8_url', streamSettings.backupVideoUrl);
      } catch {}
    }
  }, [streamSettings.backupVideoUrl]);

  const handleSaveBackupM3u8 = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUrl = backupM3u8Input.trim();
    try {
      localStorage.setItem('golbolivia_backup_m3u8_url', cleanUrl);
    } catch {}

    onUpdateStreamSettings({
      backupVideoUrl: cleanUrl,
    });
    apiClient.updateStreamSettings({ backupVideoUrl: cleanUrl }).catch(() => {});
    setBackupSaveSuccess(true);
    setTimeout(() => setBackupSaveSuccess(false), 4500);
  };

  // Latency & Health check state for MediaMTX (OBS) and Backup CDN streams
  const [latencyResults, setLatencyResults] = useState<{
    obs?: LatencyTestResult;
    backup?: LatencyTestResult;
  }>({});
  const [isTestingLatency, setIsTestingLatency] = useState<{
    obs?: boolean;
    backup?: boolean;
  }>({});
  const [verifyBeforeSwitch, setVerifyBeforeSwitch] = useState<boolean>(true);
  const [isVerifyingSwitch, setIsVerifyingSwitch] = useState<boolean>(false);
  const [switchWarning, setSwitchWarning] = useState<{
    targetSource: 'obs' | 'backup';
    targetUrl: string;
    result: LatencyTestResult;
  } | null>(null);
  const [switchSuccessToast, setSwitchSuccessToast] = useState<{
    source: 'obs' | 'backup';
    latencyMs: number;
  } | null>(null);

  // Latency verification function via HTTP HEAD
  const handleTestLatency = async (
    target: 'obs' | 'backup',
    manualUrl?: string
  ): Promise<LatencyTestResult> => {
    const url = (
      manualUrl !== undefined
        ? manualUrl
        : target === 'backup'
        ? backupM3u8Input
        : videoUrlInput
    ).trim();

    setIsTestingLatency((prev) => ({ ...prev, [target]: true }));
    try {
      const res = await verifyStreamLatency(url, 4000);
      setLatencyResults((prev) => ({ ...prev, [target]: res }));
      return res;
    } finally {
      setIsTestingLatency((prev) => ({ ...prev, [target]: false }));
    }
  };

  // Immediate authoritative stream source execution
  const executeSwitchStreamSource = (source: 'obs' | 'backup') => {
    try {
      localStorage.setItem('golbolivia_active_stream_source', source);
    } catch {}

    const updates: Partial<StreamSettings> = {
      activeStreamSource: source,
      broadcastMode: 'obs_custom',
      isLive: true,
    };

    if (source === 'backup') {
      const cleanBackup = backupM3u8Input.trim();
      updates.backupVideoUrl = cleanBackup;
    } else {
      const cleanObs = videoUrlInput.trim();
      updates.customVideoUrl = cleanObs;
    }

    onUpdateStreamSettings(updates);
    apiClient
      .failoverStream({
        activeStreamSource: source,
        backupVideoUrl: backupM3u8Input.trim(),
        backupChannelName: streamSettings.backupChannelName || 'Canal de Respaldo M3U8',
      })
      .catch(() => {});

    setPreviewKey((prev) => prev + 1);
    setSwitchWarning(null);
  };

  // Pre-switch handler with HEAD latency verification
  const handleSwitchStreamSource = async (source: 'obs' | 'backup') => {
    const targetUrl = (source === 'backup' ? backupM3u8Input : videoUrlInput).trim();

    // If pre-switch verification is turned off, apply immediately
    if (!verifyBeforeSwitch) {
      executeSwitchStreamSource(source);
      return;
    }

    // If no URL is configured, warn immediately
    if (!targetUrl) {
      setSwitchWarning({
        targetSource: source,
        targetUrl: '',
        result: {
          ok: false,
          latencyMs: 0,
          httpStatus: 0,
          quality: 'offline',
          error: `No hay URL de ${source === 'obs' ? 'OBS Studio / MediaMTX' : 'Respaldo .M3U8'} configurada.`,
          checkedAt: Date.now(),
          methodUsed: 'HEAD',
        },
      });
      return;
    }

    setIsVerifyingSwitch(true);
    try {
      const testResult = await handleTestLatency(source, targetUrl);

      if (testResult.ok) {
        executeSwitchStreamSource(source);
        setSwitchSuccessToast({ source, latencyMs: testResult.latencyMs });
        setTimeout(() => setSwitchSuccessToast(null), 4500);
      } else {
        // MediaMTX or CDN did not respond to fetch HEAD; require explicit confirmation before forcing switch
        setSwitchWarning({
          targetSource: source,
          targetUrl,
          result: testResult,
        });
      }
    } finally {
      setIsVerifyingSwitch(false);
    }
  };

  const currentEvent = liveEvents?.find((e) => e.id === activeEventId) || liveEvents?.[0];
  const currentHomeId = currentEvent?.homeTeam || streamSettings.homeClubId || 'bolivar';
  const currentAwayId = currentEvent?.awayTeam || streamSettings.awayClubId || 'strongest';
  const homeClub = clubs[currentHomeId] || BOLIVIAN_CLUBS[currentHomeId] || BOLIVIAN_CLUBS.bolivar;
  const awayClub = clubs[currentAwayId] || BOLIVIAN_CLUBS[currentAwayId] || BOLIVIAN_CLUBS.strongest;

  const [isSavingFirebase, setIsSavingFirebase] = useState(false);
  const [firebaseSavedBanner, setFirebaseSavedBanner] = useState<string | null>(null);

  const handleSaveAndConfirmAllToFirebase = async () => {
    // 1. Strict validation of club IDs format and distinct clubs
    const clubIdRegex = /^[a-z0-9_-]{2,32}$/;
    const cleanHomeId = (streamSettings.homeClubId || '').trim().toLowerCase();
    const cleanAwayId = (streamSettings.awayClubId || '').trim().toLowerCase();

    if (!cleanHomeId || !clubIdRegex.test(cleanHomeId)) {
      setFirebaseSavedBanner('❌ Error de validación: El ID del club local es inválido (debe tener entre 2 y 32 caracteres alfanuméricos).');
      setTimeout(() => setFirebaseSavedBanner(null), 5000);
      return;
    }

    if (!cleanAwayId || !clubIdRegex.test(cleanAwayId)) {
      setFirebaseSavedBanner('❌ Error de validación: El ID del club visitante es inválido (debe tener entre 2 y 32 caracteres alfanuméricos).');
      setTimeout(() => setFirebaseSavedBanner(null), 5000);
      return;
    }

    if (cleanHomeId === cleanAwayId) {
      setFirebaseSavedBanner('❌ Error: El club local y el club visitante no pueden ser el mismo equipo. Selecciona dos clubes distintos.');
      setTimeout(() => setFirebaseSavedBanner(null), 5000);
      return;
    }

    // 2. Strict validation of scores (0 to 50)
    if (typeof homeScore !== 'number' || isNaN(homeScore) || homeScore < 0 || homeScore > 50) {
      setFirebaseSavedBanner('❌ Error de puntuación: Los goles del club local deben ser un número entre 0 y 50.');
      setTimeout(() => setFirebaseSavedBanner(null), 5000);
      return;
    }

    if (typeof awayScore !== 'number' || isNaN(awayScore) || awayScore < 0 || awayScore > 50) {
      setFirebaseSavedBanner('❌ Error de puntuación: Los goles del club visitante deben ser un número entre 0 y 50.');
      setTimeout(() => setFirebaseSavedBanner(null), 5000);
      return;
    }

    // 3. Strict validation of match minute (0 to 130)
    if (typeof matchMinute !== 'number' || isNaN(matchMinute) || matchMinute < 0 || matchMinute > 130) {
      setFirebaseSavedBanner('❌ Error de tiempo: El minuto oficial debe estar entre 0 y 130 minutos.');
      setTimeout(() => setFirebaseSavedBanner(null), 5000);
      return;
    }

    // 4. Validation of title length
    const cleanTitle = (streamSettings.title || '').trim();
    if (!cleanTitle || cleanTitle.length < 3 || cleanTitle.length > 120) {
      setFirebaseSavedBanner('❌ Error: El título del partido debe tener entre 3 y 120 caracteres.');
      setTimeout(() => setFirebaseSavedBanner(null), 5000);
      return;
    }

    setIsSavingFirebase(true);
    try {
      const res = await apiClient.confirmAndSaveAllData({
        streamSettings: {
          ...streamSettings,
          homeClubId: cleanHomeId,
          awayClubId: cleanAwayId,
          title: cleanTitle,
        },
        scoreboard: {
          homeScore: Math.round(homeScore),
          awayScore: Math.round(awayScore),
          matchMinute: Math.round(matchMinute),
          period: streamSettings.period || '2T',
          activeEventId: activeEventId || currentEvent?.id || 'partido-001',
          eventId: activeEventId || currentEvent?.id || 'partido-001',
          force: true,
        },
        operatorName: currentUser?.name,
        operatorRole: currentUser?.role,
      });
      setFirebaseSavedBanner(res.message);
      setTimeout(() => setFirebaseSavedBanner(null), 6000);
    } catch (err: any) {
      setFirebaseSavedBanner(`❌ Error al guardar datos oficiales: ${err.message || 'Error de conexión o permisos insuficientes en el servidor'}`);
      setTimeout(() => setFirebaseSavedBanner(null), 7000);
    } finally {
      setIsSavingFirebase(false);
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

        {/* Sub-Header Navigation Tabs: 5 Pestañas Claras y Sin Opciones Repetidas */}
        <div className="bg-[#090e1c] border-b border-slate-800/90 px-4 sm:px-6 py-2 flex items-center justify-between overflow-x-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('stream')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'stream'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-950/40 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              <span>Transmisión & Señal</span>
            </button>
            <button
              onClick={() => setActiveTab('match')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'match'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-950/40 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Partido & Marcador</span>
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'teams'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-950/40 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Equipos ({Object.keys(clubs).length})</span>
            </button>
            <button
              onClick={() => setActiveTab('events_chat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'events_chat'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-950/40 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>Eventos & Moderación</span>
            </button>
            <button
              onClick={() => setActiveTab('vip_analytics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'vip_analytics'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-950/40 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>VIP & Audiencia</span>
            </button>
            <button
              onClick={() => setActiveTab('qr_donations')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'qr_donations'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-950/40 font-bold'
                  : 'text-rose-300 hover:text-white hover:bg-rose-950/40 border border-rose-500/20'
              }`}
              title="Cambiar imagen de código QR y opciones para el botón Apóyame"
            >
              <Heart className={`w-3.5 h-3.5 ${activeTab === 'qr_donations' ? 'fill-white text-white' : 'fill-rose-500 text-rose-400'}`} />
              <span>QR Apóyame</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            {presenceStats && (
              <span className="text-[11px] px-2.5 py-1 rounded-lg font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{presenceStats.totalOnSite.toLocaleString()} en vivo</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden xl:flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span>Marcador: <strong className="text-white">{homeScore} - {awayScore}</strong></span>
              <span>·</span>
              <span>Minuto: <strong className="text-emerald-400">{matchMinute}&apos;</strong></span>
            </div>

            {/* BOTÓN OFICIAL DE GUARDADO Y CONFIRMACIÓN EN FIREBASE */}
            <button
              onClick={handleSaveAndConfirmAllToFirebase}
              disabled={isSavingFirebase}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-black text-xs font-black flex items-center gap-1.5 shadow-lg shadow-amber-950/60 transition-all cursor-pointer disabled:opacity-50"
              title="Confirmar y persistir toda la página y señales en Google Firebase Firestore"
            >
              <Database className={`w-3.5 h-3.5 ${isSavingFirebase ? 'animate-spin' : 'text-black'}`} />
              <span>{isSavingFirebase ? 'Guardando...' : 'Confirmar & Guardar en Firebase'}</span>
            </button>
          </div>
        </div>

        {/* Banner de Confirmación y Persistencia en Firebase */}
        {firebaseSavedBanner && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/50 px-4 sm:px-6 py-2.5 text-xs text-emerald-200 flex items-center justify-between shadow-xl animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">{firebaseSavedBanner}</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-emerald-400/80">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Google Cloud Firestore · gen-lang-client-0595946513 (us-west1)</span>
            </div>
          </div>
        )}

        {/* Main Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
          {activeTab === 'stream' ? (
            /* PESTAÑA 1: TRANSMISIÓN & SEÑALES M3U8 */
            <div className="space-y-6">
              {/* ACCESO RÁPIDO: GESTIÓN DEL QR DEL BOTÓN APÓYAME */}
              <div className="bg-gradient-to-r from-rose-950/40 via-[#0e1628] to-[#0a0f1d] border border-rose-500/30 rounded-2xl p-3.5 sm:p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 shadow">
                    <Heart className="w-5 h-5 fill-rose-500 text-rose-400" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      ¿Deseas cambiar el Código QR del botón «Apóyame»?
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Puedes subir tu imagen de QR directamente en la nueva pestaña «QR Apóyame» o al final de esta página (Sección 6).
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('qr_donations')}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer self-start sm:self-auto shrink-0 shadow-md active:scale-95"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Configurar QR Apóyame</span>
                </button>
              </div>

              {/* FUENTES Y CANALES DE TRANSMISIÓN MULTI-PLATAFORMA (CLOUDFLARE · YOUTUBE · KICK) */}
              <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                        Proveedor Principal y Canales de Transmisión
                      </h3>
                      <p className="text-xs text-slate-400">
                        Configura la señal de emisión activa para los espectadores sin alterar los equipos ni el marcador.
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] px-2.5 py-1 rounded-full font-mono font-bold uppercase bg-slate-900 border border-slate-700 text-slate-300">
                    Proveedor al Aire: <strong className="text-amber-400">{streamSettings.primaryProvider || 'cloudflare'}</strong>
                  </span>
                </div>

                {/* Selector de Proveedor Principal */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Seleccionar Proveedor al Aire (Señal Primaria):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateStreamSettings({ primaryProvider: 'cloudflare' });
                        apiClient.updateStreamSettings({ primaryProvider: 'cloudflare' }).catch(() => {});
                      }}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                        (streamSettings.primaryProvider || 'cloudflare') === 'cloudflare'
                          ? 'bg-sky-950/80 border-sky-400 ring-1 ring-sky-400 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Zap className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-white">Cloudflare Stream</div>
                        <div className="text-[10px] text-slate-400">HLS .m3u8 nativo de baja latencia</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onUpdateStreamSettings({ primaryProvider: 'youtube' });
                        apiClient.updateStreamSettings({ primaryProvider: 'youtube' }).catch(() => {});
                      }}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                        streamSettings.primaryProvider === 'youtube'
                          ? 'bg-red-950/80 border-red-400 ring-1 ring-red-400 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Tv className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-white">YouTube Live</div>
                        <div className="text-[10px] text-slate-400">Embebido con ID oficial</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onUpdateStreamSettings({ primaryProvider: 'kick' });
                        apiClient.updateStreamSettings({ primaryProvider: 'kick' }).catch(() => {});
                      }}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                        streamSettings.primaryProvider === 'kick'
                          ? 'bg-emerald-950/80 border-emerald-400 ring-1 ring-emerald-400 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Radio className="w-4 h-4 text-[#53fc18] mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-white">Kick Streaming</div>
                        <div className="text-[10px] text-slate-400">Canal de emisión en Kick</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Inputs de Canales */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
                    <label className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
                      <Tv className="w-3.5 h-3.5" />
                      <span>YouTube Video ID o URL:</span>
                    </label>
                    <input
                      type="text"
                      value={streamSettings.youtube?.videoId || ''}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        let id = val;
                        if (val.includes('youtube.com/watch?v=')) id = val.split('v=')[1]?.split('&')[0] || val;
                        else if (val.includes('youtu.be/')) id = val.split('youtu.be/')[1]?.split('?')[0] || val;
                        onUpdateStreamSettings({ youtube: { videoId: id } });
                      }}
                      placeholder="jfKfPfyJRdk o https://youtube.com/watch?v=..."
                      className="w-full bg-[#060a14] border border-slate-750 focus:border-red-500 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none"
                    />
                  </div>

                  <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
                    <label className="text-xs font-semibold text-[#53fc18] flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5" />
                      <span>Kick Channel Name:</span>
                    </label>
                    <input
                      type="text"
                      value={streamSettings.kick?.channel || ''}
                      onChange={(e) => {
                        const val = e.target.value.trim().replace('https://kick.com/', '');
                        onUpdateStreamSettings({ kick: { channel: val } });
                      }}
                      placeholder="golbolivia"
                      className="w-full bg-[#060a14] border border-slate-750 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* TARJETA DESTACADA: CONEXIÓN Y GUARDADO DE SEÑAL DE VIDEO REAL */}
              <div className="bg-gradient-to-r from-[#0d162b] via-[#0e1830] to-[#0a1226] border-2 border-emerald-500/50 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-emerald-950/20">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm sm:text-base font-bold text-white font-display">
                          Conexión de Señal en Vivo (OBS / MediaMTX / Cloudflare)
                        </h2>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase ${
                          streamSettings.customVideoUrl
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {streamSettings.customVideoUrl ? 'SEÑAL EXTERNA ACTIVA' : 'SIMULACIÓN CANCHA'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Pega tu enlace de transmisión <code className="text-emerald-300 font-mono">.m3u8</code> y presiona <strong>GUARDAR Y CONECTAR SEÑAL</strong> para emitirla a los hinchas.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleQuickPasteCloudflare}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    title="Cargar automáticamente el enlace de Cloudflare Tunnel generado"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pegar tu enlace Cloudflare</span>
                  </button>
                </div>

                <form onSubmit={handleSaveVideoUrl} className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <input
                        type="url"
                        value={videoUrlInput}
                        onChange={(e) => setVideoUrlInput(e.target.value)}
                        placeholder="https://stuffed-january-bulk-self.trycloudflare.com/live/partido/index.m3u8"
                        className="w-full bg-[#060a14] border-2 border-emerald-500/60 focus:border-emerald-400 rounded-xl px-4 py-3 text-xs sm:text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingUrl}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 hover:from-emerald-400 hover:to-emerald-300 disabled:opacity-50 text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/80 transition-all cursor-pointer whitespace-nowrap active:scale-95"
                    >
                      {isSavingUrl ? (
                        <RefreshCw className="w-4 h-4 text-black animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-black" />
                      )}
                      <span>{isSavingUrl ? 'GUARDANDO EN SERVIDOR...' : 'GUARDAR Y CONECTAR SEÑAL'}</span>
                    </button>

                    {/* Botón de Verificación de Latencia HEAD para MediaMTX / OBS */}
                    <button
                      type="button"
                      onClick={() => handleTestLatency('obs')}
                      disabled={isTestingLatency.obs}
                      className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-emerald-500/40 text-emerald-400 hover:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shadow-md active:scale-95"
                      title="Probar latencia y conectividad del servidor MediaMTX mediante petición HTTP HEAD"
                    >
                      {isTestingLatency.obs ? (
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                      ) : (
                        <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span>{isTestingLatency.obs ? 'PROBANDO HEAD...' : 'VERIFICAR LATENCIA HEAD'}</span>
                    </button>

                    {streamSettings.customVideoUrl && (
                      <button
                        type="button"
                        onClick={handleClearVideoUrl}
                        className="px-3.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1 border border-slate-700 cursor-pointer"
                        title="Desconectar señal de video y volver a la simulación interactiva"
                      >
                        <span>Quitar</span>
                      </button>
                    )}
                  </div>

                  {/* Localhost / Insecure HTTP warning banner */}
                  {(videoUrlInput.includes('localhost') || videoUrlInput.includes('127.0.0.1')) && (
                    <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2 shadow-md">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold text-amber-300">
                          Importante para ver en cualquier celular, tablet o Smart TV:
                        </p>
                        <p className="text-[11px] text-amber-200/90 leading-relaxed">
                          La dirección <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300 font-mono">localhost</code> o <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300 font-mono">127.0.0.1</code> solo es visible en tu propia computadora. Para que cualquier usuario en otro dispositivo pueda ver tu transmisión, usa el enlace público HTTPS de <strong>Cloudflare Tunnel</strong> (ej: <code className="text-white font-mono">https://xxxx.trycloudflare.com/.../index.m3u8</code>).
                        </p>
                      </div>
                    </div>
                  )}

                  {urlSaveError && (
                    <div className="p-3 bg-red-950/90 border border-red-500 rounded-xl text-xs text-red-200 flex items-center gap-2 shadow-lg">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>
                        <strong>Error al guardar:</strong> {urlSaveError}
                      </span>
                    </div>
                  )}

                  {urlSaveSuccess && (
                    <div className="p-3 bg-emerald-950/90 border border-emerald-500 rounded-xl text-xs text-emerald-200 flex items-center gap-2 shadow-lg animate-pulse">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong>¡Señal guardada y lista para cualquier dispositivo!</strong> Enlace de transmisión sincronizado en el servidor (persistido en disco) para celulares, Smart TVs, computadoras y tablets.
                      </span>
                    </div>
                  )}

                  {/* OBS / MediaMTX Latency Diagnostic Result */}
                  {latencyResults.obs && (
                    <div
                      className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-lg transition-all ${
                        latencyResults.obs.ok
                          ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
                          : 'bg-red-950/70 border-red-500/60 text-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {latencyResults.obs.ok ? (
                          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold flex items-center gap-2">
                            <span>
                              {latencyResults.obs.ok
                                ? 'Servidor MediaMTX (OBS) en Línea y Respondiendo'
                                : 'Servidor MediaMTX (OBS) Sin Respuesta'}
                            </span>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-black ${
                                latencyResults.obs.ok
                                  ? latencyResults.obs.quality === 'ultra-low'
                                    ? 'bg-emerald-400 text-black'
                                    : 'bg-amber-400 text-black'
                                  : 'bg-red-500 text-white'
                              }`}
                            >
                              {latencyResults.obs.ok
                                ? `${latencyResults.obs.latencyMs} ms (${latencyResults.obs.quality === 'ultra-low' ? 'Ultra-baja' : 'Buena'})`
                                : 'Offline / Error'}
                            </span>
                          </p>
                          <p className="text-[11px] opacity-90 mt-0.5">
                            {latencyResults.obs.ok
                              ? `Verificación HTTP ${latencyResults.obs.methodUsed} exitosa (HTTP ${latencyResults.obs.httpStatus}). El flujo HLS está listo para conmutarse sin interrupciones.`
                              : latencyResults.obs.error ||
                                'No se recibió respuesta en el tiempo límite. Verifica que OBS y MediaMTX estén encendidos y transmitiendo.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(latencyResults.obs.checkedAt).toLocaleTimeString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleTestLatency('obs')}
                          disabled={isTestingLatency.obs}
                          className="px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/60 border border-white/10 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw
                            className={`w-3 h-3 ${isTestingLatency.obs ? 'animate-spin' : ''}`}
                          />
                          <span>Repetir</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <span className="truncate">
                      Enlace OBS configurado:{' '}
                      <strong className="text-emerald-400 font-mono select-all">
                        {streamSettings.customVideoUrl || '(Ninguno - usando animación interactiva)'}
                      </strong>
                    </span>
                    <span className="text-emerald-400/90 font-medium">✓ Sincronizado en tiempo real con el servidor y guardado en disco</span>
                  </div>
                </form>

                {/* SECCIÓN DEDICADA: URL M3U8 DE RESPALDO (LOCALSTORAGE) Y ALTERNADOR DE FUENTES */}
                <div className="pt-4 border-t-2 border-slate-800/90 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                        <Radio className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>Fuente de Respaldo .M3U8 (Para cuando el OBS no esté conectado)</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Database className="w-2.5 h-2.5" />
                            <span>LOCALSTORAGE</span>
                          </span>
                        </h3>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Ingresa y guarda en tu navegador la URL <code className="text-amber-300 font-mono">.m3u8</code> alternativa para mantener la transmisión viva cuando OBS esté apagado.
                        </p>
                      </div>
                    </div>

                    {/* Active Streaming Source Badge */}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                      <span className="text-slate-400 text-[11px]">Fuente al aire:</span>
                      <span className={`font-mono font-bold text-xs flex items-center gap-1.5 ${
                        streamSettings.activeStreamSource === 'backup'
                          ? 'text-amber-400'
                          : streamSettings.activeStreamSource === 'simulation'
                          ? 'text-blue-400'
                          : 'text-emerald-400'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${
                          streamSettings.activeStreamSource === 'backup'
                            ? 'bg-amber-400 animate-ping'
                            : streamSettings.activeStreamSource === 'simulation'
                            ? 'bg-blue-400'
                            : 'bg-emerald-400 animate-pulse'
                        }`} />
                        {streamSettings.activeStreamSource === 'backup'
                          ? 'RESPALDO M3U8'
                          : streamSettings.activeStreamSource === 'simulation'
                          ? 'CANCHA 2D'
                          : 'LOCAL OBS'}
                      </span>
                    </div>
                  </div>

                  {/* Backup M3U8 Dedicated Input Field */}
                  <form onSubmit={handleSaveBackupM3u8} className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <input
                          type="url"
                          value={backupM3u8Input}
                          onChange={(e) => setBackupM3u8Input(e.target.value)}
                          placeholder="https://servidor-cdn.com/live/respaldo/index.m3u8"
                          className="w-full bg-[#060a14] border-2 border-amber-500/60 focus:border-amber-400 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950/60 transition-all cursor-pointer whitespace-nowrap active:scale-95"
                      >
                        <Save className="w-4 h-4 text-black" />
                        <span>GUARDAR EN LOCALSTORAGE</span>
                      </button>

                      {/* Botón de Verificación de Latencia HEAD para CDN de Respaldo */}
                      <button
                        type="button"
                        onClick={() => handleTestLatency('backup')}
                        disabled={isTestingLatency.backup}
                        className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-amber-500/40 text-amber-400 hover:text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shadow-md active:scale-95"
                        title="Probar latencia y disponibilidad de la CDN de respaldo mediante HTTP HEAD"
                      >
                        {isTestingLatency.backup ? (
                          <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                        ) : (
                          <Activity className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span>{isTestingLatency.backup ? 'PROBANDO CDN...' : 'VERIFICAR LATENCIA CDN'}</span>
                      </button>
                    </div>

                    {/* Quick Presets for Backup M3U8 */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                      <span className="text-slate-400 text-[10px] font-medium">Preajustes sugeridos de respaldo:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const url = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
                          setBackupM3u8Input(url);
                          try { localStorage.setItem('golbolivia_backup_m3u8_url', url); } catch {}
                          onUpdateStreamSettings({ backupVideoUrl: url });
                          apiClient.updateStreamSettings({ backupVideoUrl: url }).catch(() => {});
                          setBackupSaveSuccess(true);
                          setTimeout(() => setBackupSaveSuccess(false), 3000);
                        }}
                        className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-850 text-amber-300 border border-amber-500/30 font-medium cursor-pointer transition-colors"
                      >
                        Canal 24/7 (Fútbol HD)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const url = 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8';
                          setBackupM3u8Input(url);
                          try { localStorage.setItem('golbolivia_backup_m3u8_url', url); } catch {}
                          onUpdateStreamSettings({ backupVideoUrl: url });
                          apiClient.updateStreamSettings({ backupVideoUrl: url }).catch(() => {});
                          setBackupSaveSuccess(true);
                          setTimeout(() => setBackupSaveSuccess(false), 3000);
                        }}
                        className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-750 font-medium cursor-pointer transition-colors"
                      >
                        Akamai Test HLS
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const url = 'https://live-par-2-abr.livepush.io/live/bigbuckbunny/index.m3u8';
                          setBackupM3u8Input(url);
                          try { localStorage.setItem('golbolivia_backup_m3u8_url', url); } catch {}
                          onUpdateStreamSettings({ backupVideoUrl: url });
                          apiClient.updateStreamSettings({ backupVideoUrl: url }).catch(() => {});
                          setBackupSaveSuccess(true);
                          setTimeout(() => setBackupSaveSuccess(false), 3000);
                        }}
                        className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-750 font-medium cursor-pointer transition-colors"
                      >
                        LivePush CDN
                      </button>
                    </div>

                    {backupSaveSuccess && (
                      <div className="p-3 bg-amber-950/80 border border-amber-500 rounded-xl text-xs text-amber-200 flex items-center gap-2 shadow-lg animate-pulse">
                        <Check className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                          <strong>¡URL de respaldo guardada en localStorage y servidor!</strong> Lista para ser emitida cuando el OBS no esté conectado.
                        </span>
                      </div>
                    )}

                    {/* Backup CDN Latency Diagnostic Result */}
                    {latencyResults.backup && (
                      <div
                        className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-lg transition-all ${
                          latencyResults.backup.ok
                            ? 'bg-amber-950/70 border-amber-500/60 text-amber-200'
                            : 'bg-red-950/70 border-red-500/60 text-red-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {latencyResults.backup.ok ? (
                            <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-4 h-4 text-amber-400" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold flex items-center gap-2">
                              <span>
                                {latencyResults.backup.ok
                                  ? 'CDN de Respaldo HLS en Línea y Lista'
                                  : 'CDN de Respaldo Sin Respuesta'}
                              </span>
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-black ${
                                  latencyResults.backup.ok
                                    ? latencyResults.backup.quality === 'ultra-low'
                                      ? 'bg-emerald-400 text-black'
                                      : 'bg-amber-400 text-black'
                                    : 'bg-red-500 text-white'
                                }`}
                              >
                                {latencyResults.backup.ok
                                  ? `${latencyResults.backup.latencyMs} ms (${latencyResults.backup.quality === 'ultra-low' ? 'Ultra-baja' : 'Buena'})`
                                  : 'Offline / Error'}
                              </span>
                            </p>
                            <p className="text-[11px] opacity-90 mt-0.5">
                              {latencyResults.backup.ok
                                ? `Verificación HTTP ${latencyResults.backup.methodUsed} exitosa (HTTP ${latencyResults.backup.httpStatus}). La lista M3U8 responde adecuadamente para failover inmediato.`
                                : latencyResults.backup.error ||
                                  'No se pudo conectar a la URL de respaldo. Comprueba el enlace o elige otro preajuste.'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(latencyResults.backup.checkedAt).toLocaleTimeString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleTestLatency('backup')}
                            disabled={isTestingLatency.backup}
                            className="px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/60 border border-white/10 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw
                              className={`w-3 h-3 ${isTestingLatency.backup ? 'animate-spin' : ''}`}
                            />
                            <span>Repetir</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </form>

                  {/* BOTONES DEDICADOS PARA ALTERNAR ENTRE FUENTE LOCAL Y FUENTE DE RESPALDO */}
                  <div className="p-3.5 bg-[#060a14] rounded-xl border border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>Alternar Fuente de Streaming en Vivo (1 Clic):</span>
                      </span>

                      {/* Checkbox: Verificación de Latencia HEAD antes de Conmutar */}
                      <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer select-none bg-slate-900/90 hover:bg-slate-850 px-2.5 py-1 rounded-lg border border-slate-750 transition-colors">
                        <input
                          type="checkbox"
                          checked={verifyBeforeSwitch}
                          onChange={(e) => setVerifyBeforeSwitch(e.target.checked)}
                          className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span className="flex items-center gap-1">
                          <Activity className="w-3 h-3 text-emerald-400" />
                          <span>Verificar latencia HEAD antes de conmutar</span>
                        </span>
                      </label>
                    </div>

                    {/* Alerta de Éxito de Conmutación Verificada */}
                    {switchSuccessToast && (
                      <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/70 text-emerald-200 text-xs flex items-center justify-between gap-2 shadow-lg animate-in fade-in">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            <strong>¡Transmisión verificada!</strong> El servidor{' '}
                            {switchSuccessToast.source === 'obs'
                              ? 'MediaMTX (OBS)'
                              : 'CDN de Respaldo'}{' '}
                            respondió al HEAD en{' '}
                            <strong className="font-mono text-emerald-300">
                              {switchSuccessToast.latencyMs} ms
                            </strong>
                            . Señal en vivo conmutada exitosamente.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSwitchSuccessToast(null)}
                          className="text-emerald-400 hover:text-white px-2 py-0.5 rounded text-xs font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* ALERTA DE ADVERTENCIA CUANDO EL FETCH HEAD FALLA ANTES DE FORZAR EL CAMBIO */}
                    {switchWarning && (
                      <div className="p-4 rounded-xl bg-red-950/95 border-2 border-red-500 shadow-2xl space-y-3 animate-in fade-in">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5 text-red-400 animate-bounce" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                              <span>⚠️ Servidor Sin Respuesta (Fallo de Verificación HEAD)</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500 text-white font-black">
                                {switchWarning.targetSource === 'obs' ? 'OBS / MediaMTX' : 'CDN Respaldo'}
                              </span>
                            </h4>
                            <p className="text-xs text-red-200 leading-relaxed">
                              La prueba de latencia (HTTP HEAD) a la URL{' '}
                              <code className="bg-black/60 px-1.5 py-0.5 rounded font-mono text-red-300 break-all select-all">
                                {switchWarning.targetUrl || '(URL vacía o no configurada)'}
                              </code>{' '}
                              no recibió respuesta positiva del servidor.
                            </p>
                            <p className="text-[11px] text-red-300/90">
                              <strong>Diagnóstico del test:</strong> {switchWarning.result.error}. Si fuerzas la conmutación sin que el servidor esté emitiendo la lista .m3u8, la pantalla de los hinchas quedará en negro.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-red-900/60">
                          <button
                            type="button"
                            onClick={() => setSwitchWarning(null)}
                            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-750 cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSwitchStreamSource(switchWarning.targetSource)}
                            disabled={isVerifyingSwitch}
                            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingSwitch ? 'animate-spin' : ''}`} />
                            <span>Reintentar Ping HEAD</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => executeSwitchStreamSource(switchWarning.targetSource)}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-black shadow-lg shadow-red-950 flex items-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Forzar Cambio de Fuente de Todos Modos</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Alternador Opción 1: Fuente Local OBS Studio */}
                      <button
                        type="button"
                        onClick={() => handleSwitchStreamSource('obs')}
                        disabled={isVerifyingSwitch}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                          streamSettings.activeStreamSource !== 'backup' && streamSettings.activeStreamSource !== 'simulation'
                            ? 'bg-gradient-to-r from-emerald-950/80 to-slate-900 border-emerald-500 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                            : 'bg-slate-900/80 hover:bg-slate-850 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Video className="w-3.5 h-3.5 text-emerald-400" />
                            <span>1. Fuente Local (OBS Studio)</span>
                          </span>

                          <div className="flex items-center gap-1.5">
                            {latencyResults.obs && (
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold flex items-center gap-1 ${
                                  latencyResults.obs.ok
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-red-500/20 text-red-300 border border-red-500/40'
                                }`}
                              >
                                <Activity className="w-2.5 h-2.5" />
                                {latencyResults.obs.ok ? `${latencyResults.obs.latencyMs}ms` : 'Sin Señal'}
                              </span>
                            )}

                            {streamSettings.activeStreamSource !== 'backup' && streamSettings.activeStreamSource !== 'simulation' && (
                              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-black bg-emerald-500 text-black">
                                AL AIRE
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {isVerifyingSwitch
                            ? 'Verificando respuesta HEAD de MediaMTX...'
                            : 'Transmite la señal en directo desde tu OBS o MediaMTX local.'}
                        </p>
                      </button>

                      {/* Alternador Opción 2: Fuente de Respaldo M3U8 */}
                      <button
                        type="button"
                        onClick={() => handleSwitchStreamSource('backup')}
                        disabled={isVerifyingSwitch}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                          streamSettings.activeStreamSource === 'backup'
                            ? 'bg-gradient-to-r from-amber-950/80 to-slate-900 border-amber-500 shadow-lg shadow-amber-950/40 ring-1 ring-amber-500/40'
                            : 'bg-slate-900/80 hover:bg-slate-850 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Radio className="w-3.5 h-3.5 text-amber-400" />
                            <span>2. Fuente de Respaldo (.m3u8)</span>
                          </span>

                          <div className="flex items-center gap-1.5">
                            {latencyResults.backup && (
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold flex items-center gap-1 ${
                                  latencyResults.backup.ok
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-red-500/20 text-red-300 border border-red-500/40'
                                }`}
                              >
                                <Activity className="w-2.5 h-2.5" />
                                {latencyResults.backup.ok ? `${latencyResults.backup.latencyMs}ms` : 'Inaccesible'}
                              </span>
                            )}

                            {streamSettings.activeStreamSource === 'backup' && (
                              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-black bg-amber-400 text-black animate-pulse">
                                AL AIRE
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {isVerifyingSwitch
                            ? 'Verificando respuesta HEAD de la CDN...'
                            : 'Transmite la URL M3U8 de respaldo guardada en localStorage cuando el OBS esté apagado.'}
                        </p>
                      </button>
                    </div>

                    {/* Status Info Footer */}
                    <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                      <span className="text-slate-400 truncate">
                        Transmitiendo actualmente:{' '}
                        <strong className="text-white font-mono select-all">
                          {streamSettings.activeStreamSource === 'backup'
                            ? `Respaldo M3U8 (${backupM3u8Input || 'Sin URL'})`
                            : `Local OBS (${streamSettings.customVideoUrl || 'Sin URL'})`}
                        </strong>
                      </span>
                      <span className="text-slate-500">
                        Cambio en caliente protegido con verificación de latencia HTTP HEAD
                      </span>
                    </div>
                  </div>
                </div>
              </div>

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

                {/* ENLACE DE ACCESO A PESTAÑA 6: CÓDIGO QR DE DONACIONES */}
                <div className="bg-[#0a0f1d] border border-slate-800 hover:border-rose-500/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                      <Heart className="w-5 h-5 fill-rose-500 text-rose-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white font-display">Código QR de Apoyo y Donaciones</h4>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Pestaña 6
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        La configuración y subida del código QR para el botón «Apóyame» ahora se gestiona de forma centralizada en la <strong>Pestaña 6 (QR Apóyame)</strong>.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('qr_donations')}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-rose-950/40 shrink-0"
                  >
                    <Heart className="w-3.5 h-3.5 fill-white" />
                    <span>Ir a Pestaña 6 (QR Apóyame)</span>
                  </button>
                </div>
              </div>
            </div>
          ) : activeTab === 'match' ? (
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
                homeScore={homeScore}
                awayScore={awayScore}
                matchMinute={matchMinute}
                onUpdateScore={onUpdateScore}
                onUpdateMinute={onUpdateMinute}
                isClockRunning={isClockRunning}
                onToggleMatchClock={onToggleMatchClock}
                onUpdatePeriod={onUpdatePeriod}
              />
            </div>
          ) : activeTab === 'teams' ? (
            /* PESTAÑA 3: GESTIÓN DE EQUIPOS */
            <TeamsManager
              clubs={clubs}
              onSaveClub={saveClub}
              onDeleteClub={deleteClub}
              currentHomeClubId={streamSettings.homeClubId}
              currentAwayClubId={streamSettings.awayClubId}
            />
          ) : activeTab === 'events_chat' ? (
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
              clubs={clubs}
            />
          ) : activeTab === 'vip_analytics' ? (
            /* PESTAÑA 5: SUSCRIPCIONES VIP & AUDIENCIA */
            <div className="space-y-6">
              <AdminVipManagement />
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
              onClick={() => { setUsernameInput('admin'); setPinInput('1925'); setErrorMsg(null); }}
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
              onClick={() => { setUsernameInput('transmisor'); setPinInput('7788'); setErrorMsg(null); }}
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
              onClick={() => { setUsernameInput('moderador'); setPinInput('4455'); setErrorMsg(null); }}
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
              onClick={() => { setUsernameInput('editor'); setPinInput('2233'); setErrorMsg(null); }}
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
              <span className="text-[10px] text-slate-500 font-mono">PIN: {usernameInput === 'admin' ? '1925' : usernameInput === 'transmisor' ? '7788' : usernameInput === 'moderador' ? '4455' : '2233'}</span>
            </div>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                maxLength={12}
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
