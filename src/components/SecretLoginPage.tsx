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
  Layers
} from 'lucide-react';
import { AdminPanel } from './AdminPanel';
import { MediaMtxGuideModal } from './MediaMtxGuideModal';
import { StreamSettings, MatchEvent, LivePoll, NotificationItem } from '../types/football';
import { BOLIVIAN_CLUBS } from '../data/bolivianFootballData';

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
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('golbolivia_secret_auth') === 'true';
  });
  const [emailInput, setEmailInput] = useState('00loslobos00@gmail.com');
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Monitor iframe state
  const [previewKey, setPreviewKey] = useState(0);
  const [isRefreshingPreview, setIsRefreshingPreview] = useState(false);

  // Active section inside the private dashboard
  const [activeTab, setActiveTab] = useState<'deck' | 'settings'>('deck');
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const homeClub = BOLIVIAN_CLUBS[streamSettings.homeClubId] || BOLIVIAN_CLUBS.bolivar;
  const awayClub = BOLIVIAN_CLUBS[streamSettings.awayClubId] || BOLIVIAN_CLUBS.strongest;

  const getStoredPin = () => {
    return localStorage.getItem('golbolivia_admin_pin') || '1925';
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const validPin = getStoredPin();

    if (pinInput.trim() === validPin) {
      setIsAuthenticated(true);
      sessionStorage.setItem('golbolivia_secret_auth', 'true');
      setErrorMsg(null);
      setPinInput('');
    } else {
      setErrorMsg('PIN o clave de seguridad incorrecta. Acceso restringido.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('golbolivia_secret_auth');
    onReturnToPublic();
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
              <div className="flex items-center gap-2">
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
              </div>
              <span className="text-[11px] text-slate-400">
                Operador: <strong className="text-amber-300">00loslobos00@gmail.com</strong> · Ruta confidencial: <code className="text-emerald-400 font-mono">/login</code>
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

        <div className="text-center mb-6">
          <h1 className="text-xl font-bold font-display text-white">Consola Maestra del Transmisor</h1>
          <p className="text-xs text-slate-400 mt-1">
            Ruta exclusiva para el administrador. Ingresa tu clave para acceder al tablero centralizado y monitor en tiempo real.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Correo Autorizado
            </label>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder="00loslobos00@gmail.com"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                PIN Maestro de Seguridad
              </label>
              <span className="text-[10px] text-slate-500">PIN por defecto: 1925</span>
            </div>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                maxLength={10}
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
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-amber-950/50 transition-all cursor-pointer"
          >
            Ingresar al Tablero de Control
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500">
            Esta consola no es pública ni visible para los espectadores en general.
          </p>
        </div>
      </div>
    </div>
  );
};
