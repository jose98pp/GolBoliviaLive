import React, { useState, useEffect, useRef } from 'react';
import { Send, Heart, Flame, Trophy, Shield, DollarSign, BarChart2, Smile, Sparkles, Filter, X } from 'lucide-react';
import { ChatMessage, LivePoll, Club } from '../types/football';
import { BOLIVIAN_CLUBS, INITIAL_CHAT, INITIAL_POLL } from '../data/bolivianFootballData';

interface LiveChatProps {
  onTriggerFloatingReaction: (emoji: string) => void;
  isVipMember: boolean;
  chatMode?: 'all' | 'subscribers' | 'muted';
  officialAnnouncement?: string;
  activePoll?: LivePoll;
  onVotePoll?: (poll: LivePoll) => void;
}

export const LiveChat: React.FC<LiveChatProps> = ({
  onTriggerFloatingReaction,
  isVipMember,
  chatMode = 'all',
  officialAnnouncement,
  activePoll,
  onVotePoll,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [inputText, setInputText] = useState('');
  const [selectedClubId, setSelectedClubId] = useState<string>('bolivar');
  const [activeFilter, setActiveFilter] = useState<'all' | 'vip' | 'relator'>('all');
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const [showSuperChatModal, setShowSuperChatModal] = useState(false);
  const [superChatAmount, setSuperChatAmount] = useState<number>(20);
  const [superChatMessage, setSuperChatMessage] = useState<string>('');
  const [poll, setPoll] = useState<LivePoll>(activePoll || INITIAL_POLL);
  const [showPollDrawer, setShowPollDrawer] = useState(false);

  useEffect(() => {
    if (activePoll) {
      setPoll(activePoll);
    }
  }, [activePoll]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // BroadcastChannel for cross-tab multi-user sync
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('gol_bolivia_live_chat_channel');
        broadcastChannelRef.current = channel;

        channel.onmessage = (event) => {
          if (event.data?.type === 'NEW_MESSAGE') {
            setMessages((prev) => [...prev, event.data.message]);
          } else if (event.data?.type === 'POLL_VOTE') {
            setPoll(event.data.poll);
          } else if (event.data?.type === 'REACTION') {
            onTriggerFloatingReaction(event.data.emoji);
          }
        };
      }
    } catch {
      // BroadcastChannel not available in private mode
    }

    return () => {
      broadcastChannelRef.current?.close();
    };
  }, [onTriggerFloatingReaction]);

  // Periodic lively stadium chat simulation from various Bolivian departments
  useEffect(() => {
    const crowdComments = [
      { text: '¡Qué tapada de Lampe en el mano a mano!', club: 'bolivar', user: 'CelestePaceño' },
      { text: '¡Vamos Tigre a meter la pelota al área!', club: 'strongest', user: 'AtigradoDelSur' },
      { text: 'Increíble el ritmo de juego a 3.600 metros de altura 🦙⚽', club: 'wilstermann', user: 'ValleAlto_Cochalo' },
      { text: 'Se siente la fiesta del clásico en todo el país 🇧🇴', club: 'oriente', user: 'CambaFutbolero' },
      { text: 'Entra el Patito Rodríguez, se viene el tercer golazo', club: 'bolivar', user: 'Academia1925' },
      { text: 'Rescalvo pide concentración en la zaga', club: 'strongest', user: 'GualdinegroPuro' },
      { text: '¡Partidazo en el Hernando Siles!', club: 'always', user: 'HinchadaAlteña' },
    ];

    const timer = setInterval(() => {
      const pick = crowdComments[Math.floor(Math.random() * crowdComments.length)];
      const newMsg: ChatMessage = {
        id: 'sim-' + Date.now(),
        sender: pick.user,
        clubId: pick.club,
        text: pick.text,
        timestamp: new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => {
        const updated = [...prev, newMsg];
        return updated.slice(-60); // keep recent 60
      });
    }, 9000);

    return () => clearInterval(timer);
  }, []);

  // Auto-scroll inside chat box ONLY (does NOT scroll the outer browser window)
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: isVipMember ? 'Miembro Socio Oficial' : 'Hincha Boliviano',
      clubId: selectedClubId,
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
      isVip: isVipMember,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');

    // Broadcast across tabs
    broadcastChannelRef.current?.postMessage({
      type: 'NEW_MESSAGE',
      message: newMsg,
    });
  };

  const handleSendSuperChat = () => {
    if (!superChatMessage.trim()) return;

    const superMsg: ChatMessage = {
      id: 'super-' + Date.now(),
      sender: 'Socio Fanático Boliviano',
      clubId: selectedClubId,
      text: superChatMessage.trim(),
      timestamp: new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
      isVip: true,
      superChatAmount: superChatAmount,
    };

    setMessages((prev) => [...prev, superMsg]);
    setSuperChatMessage('');
    setShowSuperChatModal(false);

    broadcastChannelRef.current?.postMessage({
      type: 'NEW_MESSAGE',
      message: superMsg,
    });

    onTriggerFloatingReaction('🏆');
  };

  const handleVotePoll = (optionId: string) => {
    if (poll.userVotedId) return; // already voted
    const updatedOptions = poll.options.map((opt) => {
      if (opt.id === optionId) {
        return { ...opt, votes: opt.votes + 1 };
      }
      return opt;
    });
    const updatedPoll: LivePoll = {
      ...poll,
      options: updatedOptions,
      totalVotes: poll.totalVotes + 1,
      userVotedId: optionId,
    };
    setPoll(updatedPoll);
    broadcastChannelRef.current?.postMessage({
      type: 'POLL_VOTE',
      poll: updatedPoll,
    });
  };

  const currentClub = BOLIVIAN_CLUBS[selectedClubId] || BOLIVIAN_CLUBS.bolivar;

  // Filter messages
  const filteredMessages = messages.filter((m) => {
    if (activeFilter === 'vip') return m.isVip || m.superChatAmount;
    if (activeFilter === 'relator') return m.isOfficialRelator;
    return true;
  });

  const bolivianEmotes = ['⚽', '🦙', '🏆', '🐯', '🦅', '⚡', '💥', '🇧🇴', '🟨', '🟥', '🥅', '🥁', '🔥', '👏'];

  return (
    <div className="flex flex-col h-full bg-[#0a0f1c] rounded-2xl border border-slate-800/90 shadow-xl overflow-hidden">
      {/* CHAT HEADER */}
      <div className="p-3 border-b border-slate-800/80 bg-[#0d1424] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="text-xs font-bold text-white tracking-wide uppercase font-display flex items-center gap-1.5">
            Chat en Directo
          </h2>
          <span className="text-[11px] text-slate-400 font-mono">1.4k espectadores</span>
        </div>

        {/* Action icons: Poll toggle & Filter */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowPollDrawer(!showPollDrawer)}
            className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer ${
              showPollDrawer ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Encuesta en Vivo del Partido"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px] font-medium">Encuesta</span>
          </button>

          <button
            onClick={() => setShowSuperChatModal(true)}
            className="px-2 py-1 bg-gradient-to-r from-amber-600 to-yellow-500 text-black font-bold text-[11px] rounded-lg shadow-sm hover:brightness-110 flex items-center gap-1 cursor-pointer"
            title="Super Gol: Destaca tu mensaje"
          >
            <DollarSign className="w-3 h-3 stroke-[3]" />
            <span>Super Gol</span>
          </button>
        </div>
      </div>

      {/* OFFICIAL ANNOUNCEMENT PINNED BANNER */}
      {officialAnnouncement && (
        <div className="px-3 py-2 bg-gradient-to-r from-emerald-950/90 via-slate-900 to-emerald-950/80 border-b border-emerald-500/40 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="text-[11px] text-emerald-200 font-medium">
              <strong className="text-emerald-400 uppercase tracking-wide text-[10px] mr-1">Transmisión Oficial:</strong>
              {officialAnnouncement}
            </span>
          </div>
        </div>
      )}

      {/* CHAT MODE RESTRICTION BANNER IF RESTRICTED */}
      {chatMode === 'muted' && (
        <div className="px-3 py-1.5 bg-red-950/60 border-b border-red-900/40 text-[11px] text-red-300 text-center font-semibold">
          Chat en modo solo lectura por decisión del transmisor
        </div>
      )}
      {chatMode === 'subscribers' && !isVipMember && (
        <div className="px-3 py-1.5 bg-amber-950/60 border-b border-amber-900/40 text-[11px] text-amber-300 text-center font-semibold">
          Chat en modo exclusivo para Socios VIP abonados
        </div>
      )}

      {/* SEGMENTED FILTER CONTROLS (Functional filter tabs) */}
      <div className="px-3 py-1.5 bg-[#080d18] border-b border-slate-800/60 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              activeFilter === 'all' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setActiveFilter('vip')}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
              activeFilter === 'vip' ? 'bg-amber-600 text-black font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Socios VIP</span>
          </button>
          <button
            onClick={() => setActiveFilter('relator')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              activeFilter === 'relator' ? 'bg-emerald-600 text-black font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Relatores Oficiales
          </button>
        </div>

        {/* Club Flair selector button */}
        <div className="flex items-center gap-1">
          <label htmlFor="club-flair-select" className="text-[10px] text-slate-500 hidden sm:inline">Tu Club:</label>
          <select
            id="club-flair-select"
            value={selectedClubId}
            onChange={(e) => setSelectedClubId(e.target.value)}
            className="bg-slate-800 text-slate-200 text-[11px] font-medium rounded px-2 py-0.5 border border-slate-700 focus:outline-none cursor-pointer"
          >
            {Object.values(BOLIVIAN_CLUBS).map((c) => (
              <option key={c.id} value={c.id}>
                {c.badgeEmoji} {c.shortName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* LIVE POLL BANNER / DRAWER */}
      {showPollDrawer && (
        <div className="p-3 bg-gradient-to-br from-[#121b2d] to-[#0c1322] border-b border-amber-600/30 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-amber-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
              <BarChart2 className="w-3.5 h-3.5" />
              Encuesta en Vivo
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{poll.totalVotes} votos</span>
          </div>
          <div className="text-white font-medium mb-2.5 text-xs">{poll.question}</div>

          <div className="space-y-1.5">
            {poll.options.map((opt) => {
              const pct = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
              const hasVoted = poll.userVotedId === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleVotePoll(opt.id)}
                  disabled={!!poll.userVotedId}
                  className={`w-full text-left p-2 rounded-lg relative overflow-hidden transition-all border cursor-pointer ${
                    hasVoted
                      ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                      : 'border-slate-700/80 bg-slate-800/60 hover:bg-slate-750 text-slate-200'
                  }`}
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-emerald-600/20 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="font-medium text-xs">{opt.text}</span>
                    <span className="font-mono text-xs font-bold tabular-nums">{pct}%</span>
                  </div>
                </button>
              );
            })}
          </div>
          {poll.userVotedId && (
            <p className="text-[10px] text-emerald-400 mt-2 text-center">✓ Tu voto fue registrado en tiempo real</p>
          )}
        </div>
      )}

      {/* MESSAGES SCROLL AREA */}
      <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[220px]">
        {filteredMessages.map((msg) => {
          const club = BOLIVIAN_CLUBS[msg.clubId] || BOLIVIAN_CLUBS.bolivar;

          // Super Chat Card Style
          if (msg.superChatAmount) {
            return (
              <div
                key={msg.id}
                className="p-2.5 rounded-xl bg-gradient-to-r from-amber-950/80 via-[#1b1406] to-amber-900/60 border border-amber-500/50 shadow-lg text-xs"
              >
                <div className="flex items-center justify-between border-b border-amber-500/30 pb-1.5 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: club.primaryColor }}
                    />
                    <span className="font-bold text-white">{msg.sender}</span>
                    <span className="text-[10px] text-amber-400 font-bold px-1.5 py-0.2 bg-amber-400/20 rounded">
                      Bs. {msg.superChatAmount}
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-200/70 font-mono">{msg.timestamp}</span>
                </div>
                <p className="text-amber-100 font-medium text-xs leading-relaxed">{msg.text}</p>
              </div>
            );
          }

          // Official Relator Style
          if (msg.isOfficialRelator) {
            return (
              <div
                key={msg.id}
                className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-emerald-400 flex items-center gap-1 text-[11px]">
                    <Shield className="w-3 h-3 fill-emerald-400" />
                    {msg.sender}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{msg.timestamp}</span>
                </div>
                <p className="text-emerald-100 text-xs font-semibold">{msg.text}</p>
              </div>
            );
          }

          // Standard Chat message
          return (
            <div key={msg.id} className="text-xs leading-relaxed group">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                {/* Club indicator dot & icon */}
                <span
                  className="w-2 h-2 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: club.primaryColor }}
                  title={club.name}
                />
                {/* Username */}
                <span className="font-semibold text-slate-300 hover:text-white cursor-pointer">
                  {msg.sender}
                </span>

                {/* VIP badge */}
                {msg.isVip && (
                  <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1 rounded">
                    SOCIO
                  </span>
                )}

                {/* Timestamp unboxed */}
                <span className="text-[10px] text-slate-500 font-mono ml-auto opacity-75">
                  {msg.timestamp}
                </span>
              </div>
              <p className="text-slate-200 mt-0.5 break-words pl-3.5">{msg.text}</p>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* QUICK EMOTE STRIP */}
      <div className="px-3 py-1.5 bg-[#0b101c] border-t border-slate-800/80 flex items-center gap-1 overflow-x-auto">
        {bolivianEmotes.slice(0, 8).map((emote) => (
          <button
            key={emote}
            onClick={() => onTriggerFloatingReaction(emote)}
            className="w-7 h-7 shrink-0 rounded-lg hover:bg-slate-800 flex items-center justify-center text-sm hover:scale-110 active:scale-90 transition-all cursor-pointer"
            title={`Reaccionar con ${emote}`}
          >
            {emote}
          </button>
        ))}
        <button
          onClick={() => setShowEmotePicker(!showEmotePicker)}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 ml-auto cursor-pointer"
          title="Ver más emojis"
        >
          <Smile className="w-4 h-4" />
        </button>
      </div>

      {/* EXPANDED EMOTE PICKER */}
      {showEmotePicker && (
        <div className="p-2 bg-[#0c1220] border-t border-slate-800 grid grid-cols-7 gap-1">
          {bolivianEmotes.map((emote) => (
            <button
              key={'picker-' + emote}
              onClick={() => {
                setInputText((prev) => prev + ' ' + emote);
                onTriggerFloatingReaction(emote);
                setShowEmotePicker(false);
              }}
              className="p-2 hover:bg-slate-800 rounded-lg text-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
            >
              {emote}
            </button>
          ))}
        </div>
      )}

      {/* CHAT INPUT FORM */}
      {chatMode === 'muted' ? (
        <div className="p-3 bg-[#0d1424] border-t border-slate-800 text-center text-xs text-slate-500 italic">
          El transmisor ha pausado los comentarios públicos en este momento.
        </div>
      ) : chatMode === 'subscribers' && !isVipMember ? (
        <div className="p-3 bg-[#0d1424] border-t border-slate-800 text-center text-xs text-amber-400">
          Modo solo socios activo. Activa el Pase Socio Digital para participar en el chat.
        </div>
      ) : (
        <form onSubmit={handleSendMessage} className="p-3 bg-[#0d1424] border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Comentar como hincha de ${currentClub.shortName}...`}
            maxLength={200}
            className="flex-1 bg-slate-900/90 text-slate-100 placeholder:text-slate-500 text-xs px-3 py-2 rounded-xl border border-slate-700/80 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-black font-bold transition-all shadow-md shadow-emerald-950/50 cursor-pointer"
            aria-label="Enviar mensaje"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* SUPER CHAT MODAL */}
      {showSuperChatModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1627] border border-amber-500/50 rounded-2xl w-full max-w-sm p-5 shadow-2xl text-slate-100 relative">
            <button
              onClick={() => setShowSuperChatModal(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-amber-400 mb-3">
              <DollarSign className="w-5 h-5 stroke-[2.5]" />
              <h3 className="font-display font-bold text-base text-white">Enviar Super Gol (Bs.)</h3>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              Destaca tu mensaje en la parte superior del chat y apoya las transmisiones del club.
            </p>

            <div className="grid grid-cols-4 gap-2 mb-4">
              {[10, 20, 50, 100].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setSuperChatAmount(amt)}
                  className={`py-2 rounded-xl font-bold font-mono text-xs transition-all cursor-pointer ${
                    superChatAmount === amt
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  Bs. {amt}
                </button>
              ))}
            </div>

            <textarea
              value={superChatMessage}
              onChange={(e) => setSuperChatMessage(e.target.value)}
              placeholder="Escribe tu mensaje de aliento destacado..."
              maxLength={150}
              rows={3}
              className="w-full bg-slate-900 border border-slate-750 rounded-xl p-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 mb-4"
            />

            <button
              onClick={handleSendSuperChat}
              disabled={!superChatMessage.trim()}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-xs hover:brightness-110 disabled:opacity-40 shadow-lg cursor-pointer"
            >
              Enviar Super Gol por Bs. {superChatAmount}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
