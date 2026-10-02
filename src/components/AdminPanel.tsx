import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  Video,
  Radio,
  Sliders,
  Send,
  Bell,
  MessageSquare,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  LogOut,
  Save,
  Check,
  Link,
  Users,
  Clock,
  Sparkles
} from 'lucide-react';
import { StreamSettings, MatchEvent, NotificationItem, LivePoll } from '../types/football';
import { BOLIVIAN_CLUBS } from '../data/bolivianFootballData';

interface AdminPanelProps {
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
  onUpdatePoll: (newPoll: LivePoll) => void;
  onClearChat: () => void;
}

const DEFAULT_ADMIN_PIN = '1925';

export const AdminPanel: React.FC<AdminPanelProps> = ({
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
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('golbolivia_admin_auth') === 'true';
  });

  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [storedPin, setStoredPin] = useState<string>(() => {
    return localStorage.getItem('golbolivia_admin_pin') || DEFAULT_ADMIN_PIN;
  });

  // Current subtab in admin dashboard
  const [adminTab, setAdminTab] = useState<'stream' | 'events' | 'push' | 'chat' | 'security'>('stream');

  // Event creation form
  const [eventType, setEventType] = useState<'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'var'>('goal');
  const [eventTeam, setEventTeam] = useState<string>(streamSettings.homeClubId);
  const [eventPlayer, setEventPlayer] = useState<string>('');
  const [eventDescription, setEventDescription] = useState<string>('');
  const [eventMinute, setEventMinute] = useState<number>(matchMinute);

  // Push notification form
  const [pushTitle, setPushTitle] = useState<string>('⚽ ¡GOOOL EN VIVO!');
  const [pushBody, setPushBody] = useState<string>('Se mueve el marcador en el Hernando Siles.');
  const [pushType, setPushType] = useState<'goal' | 'stream_start' | 'lineup' | 'exclusive'>('goal');

  // Official announcement form
  const [officialNoticeText, setOfficialNoticeText] = useState<string>('');

  // New poll form
  const [pollQuestion, setPollQuestion] = useState<string>('¿Quién fue la figura del partido?');
  const [pollOpt1, setPollOpt1] = useState<string>('Ramiro Vaca');
  const [pollOpt2, setPollOpt2] = useState<string>('Michael Ortega');
  const [pollOpt3, setPollOpt3] = useState<string>('Carlos Lampe');

  // Security new PIN
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState<boolean>(false);

  // Status feedback
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);
  const [panelVideoUrl, setPanelVideoUrl] = useState<string>(streamSettings.customVideoUrl || '');
  const [panelVideoSaved, setPanelVideoSaved] = useState<boolean>(false);

  useEffect(() => {
    if (streamSettings.customVideoUrl) {
      setPanelVideoUrl(streamSettings.customVideoUrl);
    }
  }, [streamSettings.customVideoUrl]);

  const handleSaveVideoFromPanel = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUrl = panelVideoUrl.trim();
    onUpdateStreamSettings({
      customVideoUrl: cleanUrl,
      broadcastMode: cleanUrl ? 'obs_custom' : 'simulation',
      isLive: true,
    });
    setPanelVideoSaved(true);
    setTimeout(() => setPanelVideoSaved(false), 4000);
  };

  const handlePanelPasteCloudflare = () => {
    const cloudflareUrl = 'https://stuffed-january-bulk-self.trycloudflare.com/live/partido/index.m3u8';
    setPanelVideoUrl(cloudflareUrl);
    onUpdateStreamSettings({
      customVideoUrl: cloudflareUrl,
      broadcastMode: 'obs_custom',
      isLive: true,
    });
    setPanelVideoSaved(true);
    setTimeout(() => setPanelVideoSaved(false), 4000);
  };

  const showFeedback = (msg: string) => {
    setSavedFeedback(msg);
    setTimeout(() => setSavedFeedback(null), 3000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === storedPin || pinInput === DEFAULT_ADMIN_PIN) {
      setIsAuthenticated(true);
      localStorage.setItem('golbolivia_admin_auth', 'true');
      setPinError(null);
      setPinInput('');
    } else {
      setPinError('PIN incorrecto. Verifica la clave de acceso de administrador.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('golbolivia_admin_auth');
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPinInput.length < 4) {
      alert('El PIN debe tener al menos 4 caracteres.');
      return;
    }
    setStoredPin(newPinInput);
    localStorage.setItem('golbolivia_admin_pin', newPinInput);
    setNewPinInput('');
    setPinChangeSuccess(true);
    setTimeout(() => setPinChangeSuccess(false), 3000);
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const club = BOLIVIAN_CLUBS[eventTeam];

    let desc = eventDescription;
    let scoreAfter: string | undefined = undefined;

    if (eventType === 'goal') {
      if (eventTeam === streamSettings.homeClubId) {
        const nextHome = homeScore + 1;
        onUpdateScore(nextHome, awayScore);
        scoreAfter = `${nextHome} - ${awayScore}`;
      } else {
        const nextAway = awayScore + 1;
        onUpdateScore(homeScore, nextAway);
        scoreAfter = `${homeScore} - ${nextAway}`;
      }
      if (!desc) {
        desc = `¡GOOOOL de ${club ? club.name : 'equipo'}! ${eventPlayer ? eventPlayer + ' remata al fondo de la red.' : 'Anotación clave en el partido.'}`;
      }
    } else if (!desc) {
      if (eventType === 'yellow_card') desc = `Tarjeta amarilla para ${eventPlayer || 'jugador'} por infracción reiterada.`;
      if (eventType === 'red_card') desc = `¡Tarjeta roja directa! Se va expulsado ${eventPlayer || 'el futbolista'}.`;
      if (eventType === 'substitution') desc = `Sustitución en ${club ? club.name : 'el equipo'}: Entra ${eventPlayer || 'jugador fresco al campo'}.`;
      if (eventType === 'var') desc = 'Revisión VAR en el campo de juego por jugada polémica.';
    }

    onAddMatchEvent({
      minute: eventMinute,
      type: eventType,
      clubId: eventTeam,
      player: eventPlayer || undefined,
      description: desc,
      scoreAfter,
    });

    // Auto-dispatch push notification if it was a goal or red card
    if (eventType === 'goal') {
      onDispatchPushNotification({
        id: 'push-auto-' + Date.now(),
        title: `⚽ ¡GOOOL DE ${club?.shortName.toUpperCase() || 'FÚTBOL'}! (${eventMinute}')`,
        body: `${eventPlayer ? eventPlayer + ' marca el tanto. ' : ''}Nuevo marcador: ${scoreAfter}`,
        timestamp: new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
        type: 'goal',
        clubId: eventTeam,
        read: false,
      });
    }

    showFeedback('Evento registrado en el minuto a minuto con éxito.');
    setEventPlayer('');
    setEventDescription('');
  };

  const handleSendCustomPush = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle.trim() || !pushBody.trim()) return;

    onDispatchPushNotification({
      id: 'push-manual-' + Date.now(),
      title: pushTitle.trim(),
      body: pushBody.trim(),
      timestamp: new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
      type: pushType,
      read: false,
    });

    showFeedback('Notificación Push emitida inmediatamente a los suscriptores.');
  };

  const handlePostOfficialAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!officialNoticeText.trim()) return;
    onPostOfficialMessage(officialNoticeText.trim());
    onUpdateStreamSettings({ officialAnnouncement: officialNoticeText.trim() });
    showFeedback('Comunicado oficial fijado y publicado en el chat.');
    setOfficialNoticeText('');
  };

  const handleCreatePoll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollQuestion.trim() || !pollOpt1.trim() || !pollOpt2.trim()) return;

    const newPoll: LivePoll = {
      id: 'poll-' + Date.now(),
      question: pollQuestion.trim(),
      options: [
        { id: 'opt-1', text: pollOpt1.trim(), votes: 0 },
        { id: 'opt-2', text: pollOpt2.trim(), votes: 0 },
        ...(pollOpt3.trim() ? [{ id: 'opt-3', text: pollOpt3.trim(), votes: 0 }] : []),
      ],
      totalVotes: 0,
    };

    onUpdatePoll(newPoll);
    showFeedback('Nueva encuesta activada en tiempo real para todos los espectadores.');
  };

  // 1. LOCK SCREEN: WHEN USER IS NOT AUTHENTICATED
  if (!isAuthenticated) {
    return (
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl max-w-md mx-auto my-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-yellow-500 to-red-600 p-[2px] mx-auto mb-3 shadow-lg shadow-emerald-950/50">
            <div className="w-full h-full bg-[#080d18] rounded-[14px] flex items-center justify-center text-emerald-400">
              <Lock className="w-7 h-7" />
            </div>
          </div>
          <h2 className="font-display font-black text-xl text-white">
            Panel de Control del Transmisor
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Área de acceso restringido exclusivamente para el propietario y director de transmisión de GolBolivia.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              PIN / Clave Maestra de Administrador
            </label>
            <div className="relative">
              <input
                type="password"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(null);
                }}
                placeholder="Ingresa tu clave de acceso..."
                maxLength={20}
                className="w-full bg-slate-900/90 border border-slate-750 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none transition-colors font-mono tracking-widest text-center"
                autoFocus
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
            {pinError && (
              <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{pinError}</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 hover:brightness-110 text-black font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Unlock className="w-4 h-4" />
            <span>Desbloquear Panel Exclusivo</span>
          </button>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 text-center">
            <span className="text-slate-500">Clave maestra inicial: </span>
            <code className="text-emerald-400 font-mono font-bold bg-slate-800 px-1.5 py-0.5 rounded">1925</code>
            <p className="text-[10px] text-slate-500 mt-1">
              (Puedes cambiar este PIN en cualquier momento dentro de la pestaña Seguridad).
            </p>
          </div>
        </form>
      </div>
    );
  }

  // 2. AUTHENTICATED ADMIN DASHBOARD
  return (
    <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl">
      {/* ADMIN HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-5 border-b border-slate-800/80 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-extrabold text-lg text-white">
                Consola Maestra del Transmisor
              </h2>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40 font-mono text-[10px] font-bold">
                ACCESO AUTORIZADO
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Transmisor oficial: <strong className="text-slate-200">00loslobos00@gmail.com</strong> · Control en vivo de la señal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {savedFeedback && (
            <div className="px-3 py-1.5 bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs rounded-lg flex items-center gap-1.5 animate-pulse">
              <Check className="w-3.5 h-3.5" />
              <span>{savedFeedback}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer ml-auto"
            title="Cerrar sesión de administrador"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Bloquear Panel</span>
          </button>
        </div>
      </div>

      {/* ADMIN NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6 text-xs font-semibold">
        <button
          onClick={() => setAdminTab('stream')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            adminTab === 'stream'
              ? 'bg-emerald-600 text-black font-bold shadow-md shadow-emerald-950/40'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850 border border-slate-800'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>Transmisión & Marcador</span>
        </button>

        <button
          onClick={() => setAdminTab('events')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            adminTab === 'events'
              ? 'bg-emerald-600 text-black font-bold shadow-md shadow-emerald-950/40'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850 border border-slate-800'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Minuto a Minuto & Goles</span>
        </button>

        <button
          onClick={() => setAdminTab('push')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            adminTab === 'push'
              ? 'bg-emerald-600 text-black font-bold shadow-md shadow-emerald-950/40'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850 border border-slate-800'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Disparar Notificaciones Push</span>
        </button>

        <button
          onClick={() => setAdminTab('chat')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            adminTab === 'chat'
              ? 'bg-emerald-600 text-black font-bold shadow-md shadow-emerald-950/40'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850 border border-slate-800'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Control Chat & Encuestas</span>
        </button>

        <button
          onClick={() => setAdminTab('security')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            adminTab === 'security'
              ? 'bg-emerald-600 text-black font-bold shadow-md shadow-emerald-950/40'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850 border border-slate-800'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Seguridad & PIN</span>
        </button>
      </div>

      {/* TAB 1: TRANSMISIÓN Y MARCADOR */}
      {adminTab === 'stream' && (
        <div className="space-y-6">
          {/* Quick Scoreboard Live Controller */}
          <div className="p-4 bg-[#0d1424] rounded-xl border border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              Marcador y Tiempo en Directo (Afecta a todos los espectadores en tiempo real)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Home score */}
              <div className="p-3 bg-[#080d18] rounded-xl border border-sky-500/40 text-center">
                <span className="text-xs font-bold text-sky-400 block mb-1">
                  {BOLIVIAN_CLUBS[streamSettings.homeClubId]?.name || 'Equipo Local'}
                </span>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => onUpdateScore(Math.max(0, homeScore - 1), awayScore)}
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-base cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-mono text-3xl font-black text-white tabular-nums px-2">
                    {homeScore}
                  </span>
                  <button
                    onClick={() => onUpdateScore(homeScore + 1, awayScore)}
                    className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-base cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Time & Period Controller */}
              <div className="p-3 bg-[#080d18] rounded-xl border border-slate-800 text-center">
                <span className="text-xs font-bold text-slate-300 block mb-1">
                  Minuto y Período
                </span>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={matchMinute}
                    onChange={(e) => onUpdateMinute(parseInt(e.target.value) || 0)}
                    className="w-16 bg-slate-900 border border-slate-700 rounded-lg p-1 text-center font-mono font-bold text-white text-base"
                  />
                  <span className="text-xs text-slate-400 font-mono">minutos</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  {(['1T', 'Descanso', '2T', 'Finalizado'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => onUpdateStreamSettings({ period: p })}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                        streamSettings.period === p
                          ? 'bg-yellow-500 text-black'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Away score */}
              <div className="p-3 bg-[#080d18] rounded-xl border border-amber-500/40 text-center">
                <span className="text-xs font-bold text-amber-400 block mb-1">
                  {BOLIVIAN_CLUBS[streamSettings.awayClubId]?.name || 'Equipo Visitante'}
                </span>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => onUpdateScore(homeScore, Math.max(0, awayScore - 1))}
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-base cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-mono text-3xl font-black text-white tabular-nums px-2">
                    {awayScore}
                  </span>
                  <button
                    onClick={() => onUpdateScore(homeScore, awayScore + 1)}
                    className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-base cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Match Title, Teams and Stadium settings */}
          <div className="p-4 bg-[#0d1424] rounded-xl border border-slate-800 space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Título Oficial del Partido (Cabecera en la Web):</label>
              <input
                type="text"
                value={streamSettings.title || ''}
                onChange={(e) => onUpdateStreamSettings({ title: e.target.value })}
                placeholder="Ej: Bolívar vs The Strongest - Clásico Paceño N° 234"
                className="w-full bg-slate-900 border border-slate-750 focus:border-emerald-500 rounded-lg p-2.5 text-white font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Club Local:</label>
                <select
                  value={streamSettings.homeClubId}
                  onChange={(e) => onUpdateStreamSettings({ homeClubId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg p-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                >
                  {Object.values(BOLIVIAN_CLUBS).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.badgeEmoji} {c.name} ({c.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Club Visitante:</label>
                <select
                  value={streamSettings.awayClubId}
                  onChange={(e) => onUpdateStreamSettings({ awayClubId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg p-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                >
                  {Object.values(BOLIVIAN_CLUBS).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.badgeEmoji} {c.name} ({c.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Estadio y Sede:</label>
                <input
                  type="text"
                  value={streamSettings.stadiumName}
                  onChange={(e) => onUpdateStreamSettings({ stadiumName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Altitud Oficial (m s.n.m.):</label>
                <input
                  type="number"
                  value={streamSettings.altitudeMeters || 3637}
                  onChange={(e) => onUpdateStreamSettings({ altitudeMeters: Number(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">Torneo / Campeonato:</label>
                <input
                  type="text"
                  value={streamSettings.tournamentName}
                  onChange={(e) => onUpdateStreamSettings({ tournamentName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg p-2 text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">Comunicado Oficial al Hincha:</label>
                <input
                  type="text"
                  value={streamSettings.officialAnnouncement || ''}
                  onChange={(e) => onUpdateStreamSettings({ officialAnnouncement: e.target.value })}
                  placeholder="Ej: Transmisión Oficial en HD para toda Bolivia por GolBolivia TV."
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg p-2 text-white"
                />
              </div>
            </div>
          </div>

          {/* Real Video Stream / HLS URL */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0d162b] to-[#0a1224] rounded-xl border-2 border-emerald-500/40 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Video className="w-4 h-4 text-emerald-400" />
                <span>URL de Stream de Video Real (HLS / m3u8 o MP4)</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                  {streamSettings.customVideoUrl ? 'ENLACE ACTIVO' : 'OPCIONAL'}
                </span>
              </label>

              <button
                type="button"
                onClick={handlePanelPasteCloudflare}
                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Pegar enlace Cloudflare</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-300">
              Pega aquí el enlace de tu transmisión desde MediaMTX o Cloudflare. Al presionar <strong>Guardar y Conectar</strong>, el reproductor cargará automáticamente el video en vivo para todos los espectadores.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={panelVideoUrl}
                onChange={(e) => setPanelVideoUrl(e.target.value)}
                placeholder="https://stuffed-january-bulk-self.trycloudflare.com/live/partido/index.m3u8"
                className="flex-1 bg-slate-900 border-2 border-slate-700 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none"
              />

              <button
                type="button"
                onClick={handleSaveVideoFromPanel}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 transition-all cursor-pointer whitespace-nowrap"
              >
                <Save className="w-4 h-4" />
                <span>GUARDAR Y CONECTAR SEÑAL</span>
              </button>
            </div>

            {panelVideoSaved && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500 rounded-xl text-xs text-emerald-200 flex items-center gap-2 animate-pulse">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>¡Enlace guardado y conectado con éxito!</strong> El reproductor ahora está transmitiendo la señal de video externa.
                </span>
              </div>
            )}
          </div>

          {/* OBS RTMP Server & Key Details (Private Broadcaster Ingest Only) */}
          <div className="p-4 bg-[#0d1424] rounded-xl border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-red-400" />
                <span>Parámetros Confidenciales de Ingesta (OBS / MediaMTX)</span>
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-bold flex items-center gap-1 w-fit">
                <Lock className="w-2.5 h-2.5" />
                <span>Exclusivo Servidor / Operador</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Estas credenciales están aisladas en el backend y protegidas por roles. <strong>Nunca se exponen a los espectadores en el frontend público ni en /api/live.</strong>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Servidor RTMP Privado:</label>
                <input
                  type="text"
                  value={streamSettings.rtmpServer || 'rtmp://localhost:1935/live'}
                  onChange={(e) => onUpdateStreamSettings({ rtmpServer: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Stream Key Confidencial:</label>
                <input
                  type="password"
                  value={streamSettings.streamKey || 'bolivia'}
                  onChange={(e) => onUpdateStreamSettings({ streamKey: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg p-2 text-white font-mono tracking-wider"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AGREGAR EVENTOS EN VIVO */}
      {adminTab === 'events' && (
        <div className="space-y-4">
          <div className="p-4 bg-[#0d1424] rounded-xl border border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-400" />
              Publicar Nuevo Evento Minuto a Minuto
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Cada evento agregado aparecerá de inmediato en la pestaña de Estadísticas de todos los espectadores. Los goles actualizan automáticamente el marcador y disparan una notificación push.
            </p>

            <form onSubmit={handleCreateEvent} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tipo de Evento:</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-750 rounded-lg p-2 text-white"
                  >
                    <option value="goal">⚽ ¡GOL!</option>
                    <option value="yellow_card">🟨 Tarjeta Amarilla</option>
                    <option value="red_card">🟥 Tarjeta Roja</option>
                    <option value="substitution">🔄 Cambio / Sustitución</option>
                    <option value="var">🛑 Revisión VAR</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Club Afectado:</label>
                  <select
                    value={eventTeam}
                    onChange={(e) => setEventTeam(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-750 rounded-lg p-2 text-white"
                  >
                    <option value={streamSettings.homeClubId}>
                      {BOLIVIAN_CLUBS[streamSettings.homeClubId]?.name} (Local)
                    </option>
                    <option value={streamSettings.awayClubId}>
                      {BOLIVIAN_CLUBS[streamSettings.awayClubId]?.name} (Visitante)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Minuto del Partido:</label>
                  <input
                    type="number"
                    value={eventMinute}
                    onChange={(e) => setEventMinute(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-750 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre del Jugador:</label>
                <input
                  type="text"
                  value={eventPlayer}
                  onChange={(e) => setEventPlayer(e.target.value)}
                  placeholder="Ej: Bruno Sávio, Patricio Rodríguez, Michael Ortega..."
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Detalle o Narración de la Jugada (Opcional):</label>
                <textarea
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  rows={2}
                  placeholder="Ej: Remate potente cruzado desde el borde del área grande..."
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg p-2 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Evento y Disparar Actualización</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: DISPARADOR DE NOTIFICACIONES PUSH */}
      {adminTab === 'push' && (
        <div className="space-y-4">
          <div className="p-4 bg-[#0d1424] rounded-xl border border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-emerald-400" />
              Emisión de Notificaciones Push Masivas
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Envía una alerta instantánea directamente a la pantalla de todos los hinchas y suscriptores suscritos con la Web Notification API y el banner toast.
            </p>

            <form onSubmit={handleSendCustomPush} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Categoría de Alerta:</label>
                  <select
                    value={pushType}
                    onChange={(e) => setPushType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-750 rounded-lg p-2 text-white"
                  >
                    <option value="goal">⚽ Alerta de Gol</option>
                    <option value="stream_start">🔴 Inicio de Transmisión Oficial</option>
                    <option value="lineup">📋 Alineación Confirmada</option>
                    <option value="exclusive">🎙️ Exclusivo de Camerinos VIP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Título de la Notificación:</label>
                  <input
                    type="text"
                    value={pushTitle}
                    onChange={(e) => setPushTitle(e.target.value)}
                    placeholder="Ej: ⚽ ¡GOOOL DE BOLÍVAR!"
                    className="w-full bg-slate-900 border border-slate-750 rounded-lg p-2 text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Cuerpo del Mensaje:</label>
                <textarea
                  value={pushBody}
                  onChange={(e) => setPushBody(e.target.value)}
                  rows={3}
                  placeholder="Escribe el mensaje que verán los usuarios en su teléfono o navegador..."
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg p-2 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer hover:brightness-110"
              >
                <Send className="w-4 h-4" />
                <span>Enviar Notificación Push a Toda la Audiencia</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: CONTROL DEL CHAT Y ENCUESTAS */}
      {adminTab === 'chat' && (
        <div className="space-y-5">
          {/* Chat Mode Control */}
          <div className="p-4 bg-[#0d1424] rounded-xl border border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
              Modo de Interacción del Chat
            </h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { id: 'all', label: 'Chat Público Abierto', desc: 'Cualquier hincha puede escribir' },
                { id: 'subscribers', label: 'Solo Socios VIP', desc: 'Exclusivo para abonados y socios' },
                { id: 'muted', label: 'Chat Silenciado', desc: 'Solo anuncios oficiales del relator' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => onUpdateStreamSettings({ chatMode: m.id as any })}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    streamSettings.chatMode === m.id
                      ? 'bg-emerald-950/60 border-emerald-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                  }`}
                >
                  <div className="font-bold text-xs">{m.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => {
                  if (confirm('¿Estás seguro de que deseas vaciar el historial de mensajes del chat?')) {
                    onClearChat();
                    showFeedback('Historial de chat limpiado.');
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/60 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vaciar Chat en Vivo</span>
              </button>
            </div>
          </div>

          {/* Official Announcement Poster */}
          <div className="p-4 bg-[#0d1424] rounded-xl border border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
              Fijar Comunicado Oficial en el Chat
            </h3>
            <form onSubmit={handlePostOfficialAnnouncement} className="flex gap-2">
              <input
                type="text"
                value={officialNoticeText}
                onChange={(e) => setOfficialNoticeText(e.target.value)}
                placeholder="Ej: Recuerden suscribirse al pase socio para ver la conferencia de prensa en 4K..."
                className="flex-1 bg-slate-900 border border-slate-750 rounded-lg px-3 py-2 text-xs text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs rounded-lg cursor-pointer shrink-0"
              >
                Fijar Comunicado
              </button>
            </form>
          </div>

          {/* Create Live Poll */}
          <div className="p-4 bg-[#0d1424] rounded-xl border border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
              Lanzar Nueva Encuesta para la Audiencia
            </h3>
            <form onSubmit={handleCreatePoll} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Pregunta:</label>
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg p-2 text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Opción 1:</label>
                  <input
                    type="text"
                    value={pollOpt1}
                    onChange={(e) => setPollOpt1(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-750 rounded-lg p-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Opción 2:</label>
                  <input
                    type="text"
                    value={pollOpt2}
                    onChange={(e) => setPollOpt2(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-750 rounded-lg p-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Opción 3 (Opcional):</label>
                  <input
                    type="text"
                    value={pollOpt3}
                    onChange={(e) => setPollOpt3(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-750 rounded-lg p-1.5 text-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs rounded-xl cursor-pointer"
              >
                Activar Encuesta en Vivo
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: SEGURIDAD Y CAMBIO DE PIN */}
      {adminTab === 'security' && (
        <div className="space-y-4 max-w-md">
          <div className="p-4 bg-[#0d1424] rounded-xl border border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              Cambiar PIN Maestro de Acceso
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Define una nueva clave de acceso para garantizar que solo tú puedas ingresar a este panel de administración.
            </p>

            <form onSubmit={handleSavePin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nuevo PIN de Administrador (mínimo 4 dígitos):
                </label>
                <input
                  type="password"
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  placeholder="Ej: 2026bolivia"
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg p-2.5 text-xs text-white font-mono"
                />
              </div>

              {pinChangeSuccess && (
                <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>PIN actualizado y guardado con éxito.</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs rounded-xl cursor-pointer"
              >
                Guardar Nuevo PIN
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
