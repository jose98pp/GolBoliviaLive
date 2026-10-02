import React, { useState } from 'react';
import {
  Lock,
  Shield,
  Eye,
  EyeOff,
  ArrowLeft,
  LogOut,
  AlertCircle,
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
  Crown
} from 'lucide-react';
import { AdminPanel } from './AdminPanel';
import { AdminVipManagement } from './AdminVipManagement';
import { MediaMtxTelemetryPanel } from './MediaMtxTelemetryPanel';
import { MediaMtxGuideModal } from './MediaMtxGuideModal';
import { authService, AuthUser, UserRole } from '../services/auth';
import { apiClient } from '../services/apiClient';
import { StreamSettings, MatchEvent, LivePoll, NotificationItem, PrivateIngestCredentials } from '../types/football';
import { BOLIVIAN_CLUBS } from '../data/bolivianFootballData';
import { RealPresenceStats } from '../hooks/useRealPresence';

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
  onReturnToPublic: () => void;
  presenceStats?: RealPresenceStats;
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
  onReturnToPublic,
  presenceStats,
}) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => authService.isAuthenticated());
  const [isVerifyingSession, setIsVerifyingSession] = useState<boolean>(true);
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
          setIsAuthenticated(false);
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

  // Active section inside the private dashboard
  const [activeTab, setActiveTab] = useState<'deck' | 'vip_management' | 'settings' | 'analytics'>('deck');
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Video stream URL input state
  const [videoUrlInput, setVideoUrlInput] = useState<string>(
    streamSettings.customVideoUrl || 'https://stuffed-january-bulk-self.trycloudflare.com/live/partido/index.m3u8'
  );
  const [urlSaveSuccess, setUrlSaveSuccess] = useState<boolean>(false);

  // Sync if customVideoUrl changes externally
  React.useEffect(() => {
    if (streamSettings.customVideoUrl) {
      setVideoUrlInput(streamSettings.customVideoUrl);
    }
  }, [streamSettings.customVideoUrl]);

  const handleSaveVideoUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUrl = videoUrlInput.trim();
    onUpdateStreamSettings({
      customVideoUrl: cleanUrl,
      broadcastMode: cleanUrl ? 'obs_custom' : 'simulation',
      isLive: true,
    });
    setUrlSaveSuccess(true);
    setPreviewKey((prev) => prev + 1);
    setTimeout(() => setUrlSaveSuccess(false), 4500);
  };

  const handleQuickPasteCloudflare = () => {
    const cloudflareUrl = 'https://stuffed-january-bulk-self.trycloudflare.com/live/partido/index.m3u8';
    setVideoUrlInput(cloudflareUrl);
    onUpdateStreamSettings({
      customVideoUrl: cloudflareUrl,
      broadcastMode: 'obs_custom',
      isLive: true,
    });
    setUrlSaveSuccess(true);
    setPreviewKey((prev) => prev + 1);
    setTimeout(() => setUrlSaveSuccess(false), 4500);
  };

  const handleClearVideoUrl = () => {
    setVideoUrlInput('');
    onUpdateStreamSettings({
      customVideoUrl: '',
      broadcastMode: 'simulation',
    });
    setPreviewKey((prev) => prev + 1);
  };

  const homeClub = BOLIVIAN_CLUBS[streamSettings.homeClubId] || BOLIVIAN_CLUBS.bolivar;
  const awayClub = BOLIVIAN_CLUBS[streamSettings.awayClubId] || BOLIVIAN_CLUBS.strongest;

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

        {/* Sub-Header Navigation Tabs: Tablero en Vivo vs Configuración Detallada */}
        <div className="bg-[#090e1c] border-b border-slate-800/90 px-4 sm:px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('deck')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'deck'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Tablero Central de Transmisión</span>
            </button>
            <button
              onClick={() => setActiveTab('vip_management')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'vip_management'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-950/40 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110" />
              <span>Gestión Suscripción VIP</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configuración Completa & Servidores</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-emerald-500 text-black shadow-md shadow-emerald-950/40 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Telemetría y Audiencia Real</span>
              {presenceStats && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeTab === 'analytics' ? 'bg-black/30 text-black' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {presenceStats.totalOnSite.toLocaleString()}
                </span>
              )}
            </button>
            <button
              onClick={() => setIsGuideOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              <span>Guía MediaMTX & OBS</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span>Marcador: <strong className="text-white">{homeScore} - {awayScore}</strong></span>
            <span>·</span>
            <span>Minuto: <strong className="text-emerald-400">{matchMinute}&apos;</strong></span>
            <span>·</span>
            <span>Período: <strong className="text-amber-400">{streamSettings.period}</strong></span>
          </div>
        </div>

        {/* Main Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
          {activeTab === 'deck' ? (
            /* TABLERO CENTRALIZADO: VISTA PREVIA EN VIVO + PANEL DE INTERRUPTORES */
            <div className="space-y-6">
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
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 hover:from-emerald-400 hover:to-emerald-300 text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/80 transition-all cursor-pointer whitespace-nowrap active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4 text-black" />
                      <span>GUARDAR Y CONECTAR SEÑAL</span>
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

                  {urlSaveSuccess && (
                    <div className="p-3 bg-emerald-950/90 border border-emerald-500 rounded-xl text-xs text-emerald-200 flex items-center gap-2 shadow-lg animate-pulse">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong>¡Señal guardada y conectada con éxito!</strong> El reproductor ahora está transmitiendo en directo tu video desde OBS Studio.
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <span className="truncate">
                      Enlace activo configurado:{' '}
                      <strong className="text-emerald-400 font-mono select-all">
                        {streamSettings.customVideoUrl || '(Ninguno - usando animación interactiva)'}
                      </strong>
                    </span>
                    <span className="text-emerald-400/90 font-medium">✓ Queda guardado automáticamente en el navegador</span>
                  </div>
                </form>
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
                        allow="autoplay"
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

              {/* Controles Rápidos de Marcador & Minuto en Tiempo Real */}
              <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                      <span>Control Rápido de Marcador en Directo</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Los cambios actualizan el marcador en el monitor y en las pantallas de todos los espectadores.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Período buttons */}
                    {(['1T', 'Descanso', '2T', 'Finalizado'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          onUpdateStreamSettings({ period: p });
                          setTimeout(() => setPreviewKey((prev) => prev + 1), 100);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          streamSettings.period === p
                            ? 'bg-amber-500 text-black font-bold'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  {/* Home Team Score Stepper */}
                  <div className="bg-[#070b14] p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">{homeClub.name}</span>
                      <span className="text-[10px] text-slate-400">Equipo Local</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onUpdateScore(Math.max(0, homeScore - 1), awayScore)}
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-mono text-xl font-black text-white w-8 text-center tabular-nums">
                        {homeScore}
                      </span>
                      <button
                        onClick={() => onUpdateScore(homeScore + 1, awayScore)}
                        className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-bold flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Minute Stepper */}
                  <div className="bg-[#070b14] p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">Minuto de Juego</span>
                      <span className="text-[10px] text-emerald-400 font-mono">Tiempo Oficial</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onUpdateMinute(Math.max(0, matchMinute - 1))}
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-mono text-xl font-black text-emerald-400 w-10 text-center tabular-nums">
                        {matchMinute}&apos;
                      </span>
                      <button
                        onClick={() => onUpdateMinute(matchMinute + 1)}
                        className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-bold flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Away Team Score Stepper */}
                  <div className="bg-[#070b14] p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">{awayClub.name}</span>
                      <span className="text-[10px] text-slate-400">Equipo Visitante</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onUpdateScore(homeScore, Math.max(0, awayScore - 1))}
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-mono text-xl font-black text-white w-8 text-center tabular-nums">
                        {awayScore}
                      </span>
                      <button
                        onClick={() => onUpdateScore(homeScore, awayScore + 1)}
                        className="w-8 h-8 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-bold flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* TELEMETRÍA REAL MEDIAMTX EN VIVO (SIN SIMULACIÓN) */}
              <MediaMtxTelemetryPanel />
            </div>
          ) : activeTab === 'vip_management' ? (
            /* GESTIÓN DE SUSCRIPCIÓN VIP Y PASARELA DE PAGOS BOLIVIA */
            <AdminVipManagement />
          ) : activeTab === 'analytics' ? (
            /* TELEMETRÍA Y ESTADÍSTICAS REALES DE AUDIENCIA (EXCLUSIVO ADMINISTRADOR) */
            <div className="space-y-6">
              {/* TELEMETRÍA REAL MEDIAMTX PROMETHEUS METRICS */}
              <MediaMtxTelemetryPanel />

              {/* Encabezado del Tablero de Telemetría */}
              <div className="bg-gradient-to-r from-[#0c1626] via-[#091220] to-[#070d18] border-2 border-emerald-500/50 rounded-2xl p-5 shadow-2xl shadow-emerald-950/20">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <Activity className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-bold text-white font-display">
                          Consola de Telemetría & Concurrencia de Audiencia
                        </h2>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          Solo Administrador
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Métricas avanzadas de presencia en la web, eventos de actividad y telemetría de red con <code className="text-emerald-300 font-mono">navigator.connection</code>.
                      </p>
                    </div>
                  </div>

                  {presenceStats && (
                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
                      <button
                        onClick={() => presenceStats.setAudienceMode('broadcast_calibrated')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          presenceStats.audienceMode === 'broadcast_calibrated'
                            ? 'bg-emerald-500 text-black font-bold shadow-md shadow-emerald-950/40'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Modo Partido (14.8k)
                      </button>
                      <button
                        onClick={() => presenceStats.setAudienceMode('strict_local')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          presenceStats.audienceMode === 'strict_local'
                            ? 'bg-emerald-500 text-black font-bold shadow-md shadow-emerald-950/40'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Conteo Estricto Real ({presenceStats.localRealTabsCount})
                      </button>
                    </div>
                  )}
                </div>

                {presenceStats ? (
                  <div className="space-y-4">
                    {/* Tarjetas de Audiencia Activa vs Total */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40">
                        <div className="flex items-center justify-between text-xs text-emerald-400 mb-1">
                          <span className="font-bold flex items-center gap-1.5">
                            <Zap className="w-4 h-4 text-emerald-400" />
                            Audiencia Activa
                          </span>
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                        <div className="font-mono text-3xl font-black text-white tracking-tight">
                          {presenceStats.activeInteracting.toLocaleString()}
                        </div>
                        <p className="text-[11px] text-emerald-300 mt-1">
                          Interactuando (chat, reacciones, votos)
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                        <div className="flex items-center justify-between text-xs text-blue-400 mb-1">
                          <span className="font-bold flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-blue-400" />
                            Audiencia Total
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">100% Web</span>
                        </div>
                        <div className="font-mono text-3xl font-black text-white tracking-tight">
                          {presenceStats.totalOnSite.toLocaleString()}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Pestañas abiertas en la web y PWA
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                        <div className="flex items-center justify-between text-xs text-amber-400 mb-1">
                          <span className="font-bold flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-amber-400" />
                            Audiencia Pasiva
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                            En fondo
                          </span>
                        </div>
                        <div className="font-mono text-3xl font-black text-white tracking-tight">
                          {presenceStats.passiveListening.toLocaleString()}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Pestañas minimizadas o sin interacción
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                        <div className="flex items-center justify-between text-xs text-purple-400 mb-1">
                          <span className="font-bold flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-purple-400" />
                            Pico Concurrente
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono font-bold">
                            Récord
                          </span>
                        </div>
                        <div className="font-mono text-3xl font-black text-white tracking-tight">
                          {presenceStats.peakOnSite.toLocaleString()}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Mayor concurrencia hoy en la página
                        </p>
                      </div>
                    </div>

                    {/* Barra de Proporción Visual */}
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-400 font-semibold">
                          ● {presenceStats.activeInteracting.toLocaleString()} Activos ({presenceStats.activeRatioPercentage}%)
                        </span>
                        <span className="text-slate-400 font-medium">
                          ● {presenceStats.passiveListening.toLocaleString()} Pasivos ({100 - presenceStats.activeRatioPercentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                          style={{ width: `${presenceStats.activeRatioPercentage}%` }}
                        />
                        <div
                          className="h-full bg-slate-700 transition-all duration-500"
                          style={{ width: `${100 - presenceStats.activeRatioPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Cargando métricas de presencia...</p>
                )}
              </div>

              {presenceStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Telemetría de Red navigator.connection */}
                  <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-5 shadow-xl">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Signal className="w-4 h-4 text-blue-400" />
                        <h3 className="text-sm font-bold text-white">
                          Telemetría de Red del Transmisor (navigator.connection)
                        </h3>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {presenceStats.networkInfo.supported ? 'API Nativa' : 'Estimación RTT'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block mb-0.5">Tipo de Red Efectiva</span>
                        <span className="text-sm font-bold text-white font-mono">{presenceStats.networkInfo.effectiveType}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block mb-0.5">Velocidad de Descarga</span>
                        <span className="text-sm font-bold text-emerald-400 font-mono">{presenceStats.networkInfo.downlinkMbps} Mbps</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block mb-0.5">Latencia RTT</span>
                        <span className="text-sm font-bold text-emerald-400 font-mono">{presenceStats.networkInfo.rttMs} ms</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block mb-0.5">Ahorro de Datos</span>
                        <span className="text-sm font-bold text-slate-300 font-mono">
                          {presenceStats.networkInfo.saveData ? 'Activado' : 'Estándar'}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      El navegador monitorea activamente la conexión de red para regular el bitrate HLS del reproductor y evitar desconexiones.
                    </p>
                  </div>

                  {/* Desglose de Dispositivos Conectados */}
                  <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-5 shadow-xl">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-sm font-bold text-white">
                          Dispositivos Conectados en Esta Web
                        </h3>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">100% golbolivia</span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white font-medium flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                            App Móvil PWA Instalada (Celular)
                          </span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {presenceStats.deviceBreakdown.pwaApp.toLocaleString()} (44%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: '44%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white font-medium flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                            Navegador Móvil (Chrome / Safari)
                          </span>
                          <span className="font-mono text-blue-400 font-bold">
                            {presenceStats.deviceBreakdown.mobileBrowser.toLocaleString()} (38%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: '38%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white font-medium flex items-center gap-1.5">
                            <Monitor className="w-3.5 h-3.5 text-amber-400" />
                            Navegador de Escritorio (PC / Mac)
                          </span>
                          <span className="font-mono text-amber-400 font-bold">
                            {presenceStats.deviceBreakdown.desktopBrowser.toLocaleString()} (14%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: '14%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white font-medium flex items-center gap-1.5">
                            <Tv className="w-3.5 h-3.5 text-purple-400" />
                            Smart TV / Google Cast desde la Web
                          </span>
                          <span className="font-mono text-purple-400 font-bold">
                            {presenceStats.deviceBreakdown.smartTvCast.toLocaleString()} (4%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: '4%' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actividad y Sesión del Administrador */}
              {presenceStats && (
                <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-5 shadow-xl">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-bold text-white">
                        Tu Sesión de Administrador en Este Dispositivo
                      </h3>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {presenceStats.currentSession.userActivityStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                    <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block mb-0.5">ID Sesión</span>
                      <span className="font-mono text-white font-semibold">{presenceStats.currentSession.sessionId}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block mb-0.5">Dispositivo</span>
                      <span className="font-medium text-white">{presenceStats.currentSession.deviceType}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block mb-0.5">Tiempo en Línea</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {Math.floor(presenceStats.currentSession.watchTimeSeconds / 60)}m {presenceStats.currentSession.watchTimeSeconds % 60}s
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block mb-0.5">Última Acción</span>
                      <span className="font-medium text-slate-200">{presenceStats.currentSession.lastInteractionText}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => presenceStats.registerUserInteraction('Clic Administrador')}
                    className="w-full py-2 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <MousePointerClick className="w-4 h-4" />
                    <span>Enviar Pulso de Interacción (Verificar Cambio a Estado Activo)</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* CONFIGURACIÓN COMPLETA & SERVIDORES (AdminPanel) */
            <AdminPanel
              streamSettings={streamSettings}
              onUpdateStreamSettings={onUpdateStreamSettings}
              homeScore={homeScore}
              awayScore={awayScore}
              matchMinute={matchMinute}
              onUpdateScore={onUpdateScore}
              onUpdateMinute={onUpdateMinute}
              onAddMatchEvent={onAddMatchEvent}
              onDispatchPushNotification={onDispatchPushNotification}
              onPostOfficialMessage={onPostOfficialMessage}
              onUpdatePoll={onUpdatePoll}
              onClearChat={onClearChat}
            />
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

        <div className="mt-5 pt-3 border-t border-slate-800/80 text-center text-[10px] text-slate-500">
          <span>La sesión se valida mediante tokens HMAC emitidos exclusivamente por el servidor.</span>
        </div>
      </div>
    </div>
  );
};
