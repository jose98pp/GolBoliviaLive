/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StreamPlayer } from './components/StreamPlayer';
import { LiveChat } from './components/LiveChat';
import { MatchStats } from './components/MatchStats';
import { ExclusiveClubZone } from './components/ExclusiveClubZone';
import { PushNotificationModal } from './components/PushNotificationModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ToastNotification } from './components/ToastNotification';
import { FloatingReactions, FloatingItem } from './components/FloatingReactions';
import { NotificationItem, StreamSettings, MatchEvent, LivePoll, ChatMessage } from './types/football';
import { BOLIVIAN_CLUBS, INITIAL_EVENTS, INITIAL_POLL } from './data/bolivianFootballData';
import { MessageSquare, Tv, Activity, ShieldCheck, Video, Flame, MapPin } from 'lucide-react';
import { SecretLoginPage } from './components/SecretLoginPage';

export default function App() {
  const [activeTab, setActiveTab] = useState<'stream' | 'stats' | 'exclusive'>('stream');
  const [mobileViewMode, setMobileViewMode] = useState<'stream' | 'chat'>('stream');
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);

  // Secret /login route detection
  const [isLoginRoute, setIsLoginRoute] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return path === '/login' || path.startsWith('/login') || hash === '#/login';
  });

  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      setIsLoginRoute(path === '/login' || path.startsWith('/login') || hash === '#/login');
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const handleReturnToPublic = () => {
    setIsLoginRoute(false);
    if (typeof window !== 'undefined' && window.history) {
      window.history.pushState({}, '', '/');
    }
  };

  // Broadcaster & Page Settings
  const [streamSettings, setStreamSettings] = useState<StreamSettings>({
    title: 'Bolívar vs The Strongest — Fecha 22 Torneo Clausura',
    tournamentName: 'División Profesional de Bolivia',
    homeClubId: 'bolivar',
    awayClubId: 'strongest',
    stadiumName: 'Estadio Olímpico Hernando Siles',
    altitudeMeters: 3637,
    period: '2T',
    isLive: true,
    rtmpServer: 'rtmp://live.boliviagol.tv/live',
    streamKey: 'live_bol_cl4s1co_99482',
    customVideoUrl: '',
    chatMode: 'all',
    officialAnnouncement: 'Transmisión oficial de GolBolivia Live desde el Hernando Siles.',
  });

  // Stream state
  const [isStreamingLive, setIsStreamingLive] = useState(true);
  const [isVipMember, setIsVipMember] = useState(false);

  // Match live score & events
  const [homeScore, setHomeScore] = useState(2);
  const [awayScore, setAwayScore] = useState(1);
  const [matchMinute, setMatchMinute] = useState(78);
  const [events, setEvents] = useState<MatchEvent[]>(INITIAL_EVENTS);
  const [activePoll, setActivePoll] = useState<LivePoll>(INITIAL_POLL);

  // Floating reactions array
  const [floatingReactions, setFloatingReactions] = useState<FloatingItem[]>([]);

  // Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'init-1',
      title: '🔴 Transmisión Oficial Iniciada',
      body: 'El Clásico Paceño Bolívar vs The Strongest ya está en el aire por OBS Studio.',
      timestamp: '19:30',
      type: 'stream_start',
      clubId: 'bolivar',
      read: false,
    },
    {
      id: 'init-2',
      title: '⚽ ¡GOOOL DE THE STRONGEST! (14\')',
      body: 'Michael Ortega abre la cuenta con un bombazo de media distancia.',
      timestamp: '19:44',
      type: 'goal',
      clubId: 'strongest',
      read: true,
    },
    {
      id: 'init-3',
      title: '⚽ ¡GOOOL DE BOLÍVAR! (39\')',
      body: 'Ramiro Vaca anota un tiro libre magistral al ángulo.',
      timestamp: '20:09',
      type: 'goal',
      clubId: 'bolivar',
      read: true,
    }
  ]);
  const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);

  // Timer for match minute
  useEffect(() => {
    const timer = setInterval(() => {
      setMatchMinute((prev) => (prev < 94 ? prev + 1 : 94));
    }, 45000);
    return () => clearInterval(timer);
  }, []);

  const triggerReaction = (emoji: string) => {
    const newReaction: FloatingItem = {
      id: 'react-' + Date.now() + '-' + Math.random(),
      emoji,
      leftPercent: 60 + Math.random() * 32, // Right side of viewport
    };
    setFloatingReactions((prev) => [...prev, newReaction]);
  };

  const removeReaction = (id: string) => {
    setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
  };

  const handleTriggerSimulatedPush = (item: NotificationItem) => {
    setNotifications((prev) => [item, ...prev]);
    setActiveToast(item);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleUpdateStreamSettings = (newSettings: Partial<StreamSettings>) => {
    setStreamSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleAddMatchEvent = (newEvent: Omit<MatchEvent, 'id'>) => {
    const fullEvent: MatchEvent = {
      ...newEvent,
      id: 'event-' + Date.now(),
    };
    setEvents((prev) => [...prev, fullEvent]);
  };

  const handlePostOfficialMessage = (text: string) => {
    const officialMsg: ChatMessage = {
      id: 'official-' + Date.now(),
      sender: 'Transmisor Oficial GolBolivia',
      clubId: streamSettings.homeClubId,
      text,
      timestamp: new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
      isOfficialRelator: true,
      isVip: true,
    };
    // Broadcast via BroadcastChannel
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('gol_bolivia_live_chat_channel');
        bc.postMessage({ type: 'NEW_MESSAGE', message: officialMsg });
        bc.close();
      }
    } catch {}
  };

  const handleUpdatePoll = (newPoll: LivePoll) => {
    setActivePoll(newPoll);
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('gol_bolivia_live_chat_channel');
        bc.postMessage({ type: 'POLL_VOTE', poll: newPoll });
        bc.close();
      }
    } catch {}
  };

  const handleClearChat = () => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('gol_bolivia_live_chat_channel');
        bc.postMessage({ type: 'CLEAR_CHAT' });
        bc.close();
      }
    } catch {}
  };

  // If user navigated to /login or #/login, render Secret Login Page exclusively
  if (isLoginRoute) {
    return (
      <SecretLoginPage
        streamSettings={streamSettings}
        onUpdateStreamSettings={handleUpdateStreamSettings}
        homeScore={homeScore}
        awayScore={awayScore}
        matchMinute={matchMinute}
        onUpdateScore={(h, a) => {
          setHomeScore(h);
          setAwayScore(a);
        }}
        onUpdateMinute={(m) => setMatchMinute(m)}
        onAddMatchEvent={handleAddMatchEvent}
        onDispatchPushNotification={(notif) => {
          setNotifications((prev) => [notif, ...prev]);
          setActiveToast(notif);
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(notif.title, { body: notif.body });
          }
        }}
        onPostOfficialMessage={handlePostOfficialMessage}
        onUpdatePoll={handleUpdatePoll}
        onClearChat={handleClearChat}
        onReturnToPublic={handleReturnToPublic}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans pb-16 md:pb-0">
      {/* Dynamic Floating Reactions Canvas */}
      <FloatingReactions reactions={floatingReactions} onRemove={removeReaction} />

      {/* Dynamic Toast Notifications */}
      <ToastNotification
        notification={activeToast}
        onDismiss={() => setActiveToast(null)}
      />

      {/* TOP NAVIGATION BAR */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openObsModal={() => {}}
        openPushModal={() => setIsPushModalOpen(true)}
        unreadNotificationsCount={unreadCount}
        isStreamingLive={isStreamingLive}
        isVipMember={isVipMember}
        toggleVipMembership={() => setIsVipMember(!isVipMember)}
      />

      {/* MAIN VIEWPORT BODY */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 md:p-6">
        {activeTab === 'stream' && (
          <div className="space-y-5">
            {/* Mobile View Toggle Buttons (Touch Ergonomics) */}
            <div className="md:hidden flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                onClick={() => setMobileViewMode('stream')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  mobileViewMode === 'stream' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400'
                }`}
              >
                <Tv className="w-3.5 h-3.5 text-emerald-400" />
                <span>Transmisión en Vivo</span>
              </button>
              <button
                onClick={() => setMobileViewMode('chat')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  mobileViewMode === 'chat' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Chat en Directo</span>
              </button>
            </div>

            {/* Split Grid for Stream & Chat */}
            <div
              className={`grid gap-5 ${
                isTheaterMode
                  ? 'grid-cols-1'
                  : 'grid-cols-1 lg:grid-cols-12 items-start'
              }`}
            >
              {/* VIDEO PLAYER COLUMN */}
              <div
                className={`${
                  isTheaterMode
                    ? 'w-full'
                    : 'lg:col-span-8'
                } ${mobileViewMode === 'chat' ? 'hidden md:block' : 'block'}`}
              >
                <StreamPlayer
                  isTheaterMode={isTheaterMode}
                  setIsTheaterMode={setIsTheaterMode}
                  openObsModal={() => {}}
                  triggerReaction={triggerReaction}
                  homeScore={homeScore}
                  awayScore={awayScore}
                  matchMinute={matchMinute}
                  streamSettings={streamSettings}
                />

                {/* Match Information Bar underneath player */}
                <div className="mt-4 p-4 rounded-xl bg-[#0a0f1d] border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                      <span className="font-semibold text-white">Transmisión Oficial</span>
                      <span>·</span>
                      <span>{streamSettings.tournamentName}</span>
                      <span>·</span>
                      <span className="text-emerald-400 font-mono font-bold">1080p60 HLS</span>
                    </div>
                    <h1 className="font-display font-bold text-base sm:text-lg text-white">
                      {streamSettings.title}
                    </h1>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => setActiveTab('stats')}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
                    >
                      <Activity className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Ver Estadísticas</span>
                    </button>
                  </div>
                </div>

                {/* Live Match Quick Summary Strip */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#090e1b] border border-slate-800">
                    <span className="text-slate-400 text-[11px]">Posesión Balón</span>
                    <div className="font-mono font-bold text-white text-sm mt-0.5">56% - 44%</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#090e1b] border border-slate-800">
                    <span className="text-slate-400 text-[11px]">Tiros al Arco</span>
                    <div className="font-mono font-bold text-white text-sm mt-0.5">7 - 4</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#090e1b] border border-slate-800">
                    <span className="text-slate-400 text-[11px]">Espectadores</span>
                    <div className="font-mono font-bold text-emerald-400 text-sm mt-0.5">38.450 en vivo</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#090e1b] border border-slate-800">
                    <span className="text-slate-400 text-[11px]">Estadio y Altitud</span>
                    <div className="font-mono font-bold text-slate-300 text-sm mt-0.5">
                      {streamSettings.altitudeMeters} m s.n.m.
                    </div>
                  </div>
                </div>
              </div>

              {/* LIVE CHAT COLUMN */}
              <div
                className={`${
                  isTheaterMode
                    ? 'w-full h-[520px]'
                    : 'lg:col-span-4 h-[620px]'
                } ${mobileViewMode === 'stream' ? 'hidden md:block' : 'block h-[70vh]'}`}
              >
                <LiveChat
                  onTriggerFloatingReaction={triggerReaction}
                  isVipMember={isVipMember}
                  chatMode={streamSettings.chatMode}
                  officialAnnouncement={streamSettings.officialAnnouncement}
                  activePoll={activePoll}
                  onVotePoll={handleUpdatePoll}
                />
              </div>
            </div>

            {/* Embedded Live Stats Section underneath for easy browsing */}
            <div className="pt-6">
              <MatchStats
                homeScore={homeScore}
                awayScore={awayScore}
                matchMinute={matchMinute}
                streamSettings={streamSettings}
                events={events}
              />
            </div>
          </div>
        )}

        {/* TAB 2: DETAILED MATCH STATS */}
        {activeTab === 'stats' && (
          <MatchStats
            homeScore={homeScore}
            awayScore={awayScore}
            matchMinute={matchMinute}
            streamSettings={streamSettings}
            events={events}
          />
        )}

        {/* TAB 3: EXCLUSIVE CLUB CONTENT */}
        {activeTab === 'exclusive' && (
          <ExclusiveClubZone
            isVipMember={isVipMember}
            toggleVipMembership={() => setIsVipMember(!isVipMember)}
          />
        )}
      </main>

      {/* PUSH NOTIFICATION MODAL */}
      <PushNotificationModal
        isOpen={isPushModalOpen}
        onClose={() => setIsPushModalOpen(false)}
        notifications={notifications}
        onTriggerSimulatedPush={handleTriggerSimulatedPush}
        onClearNotifications={() => setNotifications([])}
      />

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileViewMode={mobileViewMode}
        setMobileViewMode={setMobileViewMode}
      />
    </div>
  );
}
