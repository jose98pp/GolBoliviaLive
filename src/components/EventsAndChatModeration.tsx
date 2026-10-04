import React, { useState } from 'react';
import {
  MessageSquare,
  Flame,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  Shield,
  Send,
  Sparkles,
  Trophy,
  VolumeX,
  Users
} from 'lucide-react';
import { MatchEvent, StreamSettings, LivePoll, NotificationItem, Club } from '../types/football';
import { apiClient } from '../services/apiClient';

interface EventsAndChatModerationProps {
  streamSettings: StreamSettings;
  onUpdateStreamSettings: (newSettings: Partial<StreamSettings>) => void;
  homeScore: number;
  awayScore: number;
  matchMinute: number;
  onUpdateScore: (home: number, away: number) => void;
  onAddMatchEvent: (event: Omit<MatchEvent, 'id'>) => void;
  onDispatchPushNotification: (notification: NotificationItem) => void;
  onPostOfficialMessage: (text: string) => void;
  onUpdatePoll: (poll: LivePoll) => void;
  onClearChat: () => void;
  clubs: Record<string, Club>;
}

export const EventsAndChatModeration: React.FC<EventsAndChatModerationProps> = ({
  streamSettings,
  onUpdateStreamSettings,
  homeScore,
  awayScore,
  matchMinute,
  onUpdateScore,
  onAddMatchEvent,
  onDispatchPushNotification,
  onPostOfficialMessage,
  onUpdatePoll,
  onClearChat,
  clubs,
}) => {
  // Event creation form
  const [eventMinute, setEventMinute] = useState(matchMinute || 75);
  const [eventType, setEventType] = useState<'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'var'>('goal');
  const [eventTeam, setEventTeam] = useState<string>(streamSettings.homeClubId || 'bolivar');
  const [eventPlayer, setEventPlayer] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventFeedback, setEventFeedback] = useState<string | null>(null);

  // Chat announcement
  const [announcementText, setAnnouncementText] = useState(streamSettings.officialAnnouncement || '');
  const [officialMessageText, setOfficialMessageText] = useState('');
  const [chatFeedback, setChatFeedback] = useState<string | null>(null);

  // Live Poll editor
  const [pollQuestion, setPollQuestion] = useState('¿Quién será la figura del Clásico Boliviano?');
  const [pollOpt1, setPollOpt1] = useState('Ramiro Vaca (Bolívar)');
  const [pollOpt2, setPollOpt2] = useState('Michael Ortega (Strongest)');
  const [pollOpt3, setPollOpt3] = useState('Carlos Lampe (Bolívar)');
  const [pollFeedback, setPollFeedback] = useState<string | null>(null);

  const homeClub = clubs[streamSettings.homeClubId] || clubs.bolivar;
  const awayClub = clubs[streamSettings.awayClubId] || clubs.strongest;

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const club = clubs[eventTeam];

    let desc = eventDescription.trim();
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
        desc = `¡GOOOOL de ${club ? club.name : 'equipo'}! ${eventPlayer ? eventPlayer + ' remata con precisión al arco.' : 'Anotación clave en el partido.'}`;
      }
    } else if (!desc) {
      if (eventType === 'yellow_card') desc = `Tarjeta amarilla para ${eventPlayer || 'jugador'} por infracción reiterada.`;
      if (eventType === 'red_card') desc = `¡Tarjeta roja directa! Se va expulsado ${eventPlayer || 'el futbolista'}.`;
      if (eventType === 'substitution') desc = `Sustitución en ${club ? club.name : 'el equipo'}: Entra ${eventPlayer || 'jugador fresco'}.`;
      if (eventType === 'var') desc = 'Revisión VAR en el campo de juego.';
    }

    onAddMatchEvent({
      minute: Number(eventMinute) || matchMinute,
      type: eventType,
      clubId: eventTeam,
      player: eventPlayer.trim() || undefined,
      description: desc,
      scoreAfter,
    });

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

    setEventFeedback('¡Evento registrado y guardado en tiempo real!');
    setEventPlayer('');
    setEventDescription('');
    setTimeout(() => setEventFeedback(null), 4000);
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateStreamSettings({ officialAnnouncement: announcementText.trim() });
    try {
      await apiClient.syncStreamConfig({ officialAnnouncement: announcementText.trim() });
      setChatFeedback('Comunicado fijado en el chat para todos los espectadores.');
      setTimeout(() => setChatFeedback(null), 4000);
    } catch {}
  };

  const handlePostOfficialRelatorMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!officialMessageText.trim()) return;
    onPostOfficialMessage(officialMessageText.trim());
    setOfficialMessageText('');
    setChatFeedback('Mensaje del relator enviado al chat.');
    setTimeout(() => setChatFeedback(null), 4000);
  };

  const handleLaunchPoll = (e: React.FormEvent) => {
    e.preventDefault();
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
    setPollFeedback('¡Nueva encuesta publicada en vivo en el chat!');
    setTimeout(() => setPollFeedback(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* SECCIÓN 1: LÍNEA DE TIEMPO DE EVENTOS */}
      <div className="bg-[#0b1222] border-2 border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-display">
              Registrar Evento en la Línea de Tiempo
            </h3>
            <p className="text-xs text-slate-400">
              Añade goles, tarjetas, cambios y VAR. Los goles actualizan el marcador automáticamente.
            </p>
          </div>
        </div>

        {eventFeedback && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{eventFeedback}</span>
          </div>
        )}

        <form onSubmit={handleCreateEvent} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Minuto:</label>
            <input
              type="number"
              min={1}
              max={120}
              value={eventMinute}
              onChange={(e) => setEventMinute(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Tipo de Evento:</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold cursor-pointer"
            >
              <option value="goal">⚽ Gol (Actualiza Marcador)</option>
              <option value="yellow_card">🟨 Tarjeta Amarilla</option>
              <option value="red_card">🟥 Tarjeta Roja Directa</option>
              <option value="substitution">🔄 Sustitución / Cambio</option>
              <option value="var">📺 Revisión VAR</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Club:</label>
            <select
              value={eventTeam}
              onChange={(e) => setEventTeam(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold cursor-pointer"
            >
              <option value={streamSettings.homeClubId}>
                {homeClub?.badgeEmoji} {homeClub?.name} (Local)
              </option>
              <option value={streamSettings.awayClubId}>
                {awayClub?.badgeEmoji} {awayClub?.name} (Visitante)
              </option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Jugador Involucrado:</label>
            <input
              type="text"
              value={eventPlayer}
              onChange={(e) => setEventPlayer(e.target.value)}
              placeholder="Ej. Ramiro Vaca"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-slate-300 font-semibold mb-1">Descripción / Detalle (Opcional):</label>
            <input
              type="text"
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
              placeholder="Ej. Tiro libre magistral al ángulo superior izquierdo..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950/40 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Publicar Evento</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECCIÓN 2: MODERACIÓN DE CHAT EN VIVO */}
      <div className="bg-[#0b1222] border-2 border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">
                Moderación y Control de Chat en Vivo
              </h3>
              <p className="text-xs text-slate-400">
                Controla quién puede chatear, fija comunicados oficiales y envía mensajes como relator.
              </p>
            </div>
          </div>

          {/* Chat Mode Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => onUpdateStreamSettings({ chatMode: 'all' })}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                streamSettings.chatMode === 'all'
                  ? 'bg-emerald-500 text-black font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => onUpdateStreamSettings({ chatMode: 'subscribers' })}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                streamSettings.chatMode === 'subscribers'
                  ? 'bg-amber-500 text-black font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Solo VIP
            </button>
            <button
              type="button"
              onClick={() => onUpdateStreamSettings({ chatMode: 'muted' })}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                streamSettings.chatMode === 'muted'
                  ? 'bg-red-500 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Silenciado
            </button>
          </div>
        </div>

        {chatFeedback && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{chatFeedback}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Post official message as broadcaster */}
          <form onSubmit={handlePostOfficialRelatorMessage} className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-3">
            <label className="block text-slate-300 font-semibold">
              Mensaje Rápido del Relator Oficial:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={officialMessageText}
                onChange={(e) => setOfficialMessageText(e.target.value)}
                placeholder="Ej. ¡Qué segundo tiempo estamos viviendo desde La Paz!"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>Enviar</span>
              </button>
            </div>
          </form>

          {/* Official pinned announcement */}
          <form onSubmit={handleSaveAnnouncement} className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-3">
            <label className="block text-slate-300 font-semibold">
              Comunicado Oficial Fijado (Barra Superior del Chat):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="Transmisión Oficial en HD para toda Bolivia..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>Fijar</span>
              </button>
            </div>
          </form>
        </div>

        {/* Clear Chat Action */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
          <span className="text-slate-400">¿Mensajes ofensivos o spam masivo?</span>
          <button
            type="button"
            onClick={onClearChat}
            className="px-3 py-1.5 bg-red-950/50 hover:bg-red-900 text-red-300 border border-red-800/50 rounded-lg flex items-center gap-1.5 cursor-pointer font-semibold"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpiar Mensajes del Chat</span>
          </button>
        </div>
      </div>

      {/* SECCIÓN 3: ENCUESTA INTERACTIVA EN VIVO */}
      <div className="bg-[#0b1222] border-2 border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-display">
              Encuesta Interactiva en Vivo
            </h3>
            <p className="text-xs text-slate-400">
              Lanza una votación en tiempo real para aumentar la interacción de los aficionados.
            </p>
          </div>
        </div>

        {pollFeedback && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{pollFeedback}</span>
          </div>
        )}

        <form onSubmit={handleLaunchPoll} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Pregunta:</label>
            <input
              type="text"
              required
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Opción 1:</label>
              <input
                type="text"
                required
                value={pollOpt1}
                onChange={(e) => setPollOpt1(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Opción 2:</label>
              <input
                type="text"
                required
                value={pollOpt2}
                onChange={(e) => setPollOpt2(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Opción 3 (Opcional):</label>
              <input
                type="text"
                value={pollOpt3}
                onChange={(e) => setPollOpt3(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-purple-950/40 cursor-pointer"
            >
              <BarChart2 className="w-4 h-4" />
              <span>Lanzar Encuesta a los Espectadores</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
