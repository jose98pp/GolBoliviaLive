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
import { PWAInstallButton } from './components/PWAInstallButton';
import { SocialFollowBanner } from './components/SocialFollowBanner';
import { LiveAudienceModal } from './components/LiveAudienceModal';
import { useRealPresence } from './hooks/useRealPresence';

export default function App() {
  const [activeTab, setActiveTab] = useState<'stream' | 'stats' | 'exclusive'>('stream');
  const [mobileViewMode, setMobileViewMode] = useState<'stream' | 'chat'>('stream');
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [isAudienceModalOpen, setIsAudienceModalOpen] = useState(false);

  // Real-time live connected presence exclusively on this web & app
  const presence = useRealPresence(true);
  const liveViewerCount = presence.onlineOnSite;

  // Secret /login route detection
  const [isLoginRoute, setIsLoginRoute] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return path === '/login' || path.startsWith('/login') || hash === '#/login';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
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
  const [streamSettings, setStreamSettings] = useState<StreamSettings>(() => {
    const defaultUrl = 'https://stuffed-january-bulk-self.trycloudflare.com/live/partido/index.m3u8';
    let saved: Partial<StreamSettings> = {};
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('golbolivia_stream_settings');
        if (raw) saved = JSON.parse(raw);
      } catch {}
      const savedUrl = localStorage.getItem('golbolivia_custom_video_url');
      if (savedUrl) saved.customVideoUrl = savedUrl;
    }
    const finalUrl = (saved.customVideoUrl && saved.customVideoUrl.trim().length > 5)
      ? saved.customVideoUrl.trim()
      : defaultUrl;

    return {
      title: saved.title || 'Bolívar vs The Strongest — Fecha 22 Torneo Clausura',
      tournamentName: saved.tournamentName || 'División Profesional de Bolivia',
      homeClubId: saved.homeClubId || 'bolivar',
      awayClubId: saved.awayClubId || 'strongest',
      stadiumName: saved.stadiumName || 'Estadio Olímpico Hernando Siles',
      altitudeMeters: saved.altitudeMeters || 3637,
      period: saved.period || '2T',
      isLive: saved.isLive ?? true,
      broadcastMode: saved.broadcastMode || 'obs_custom',
      rtmpServer: saved.rtmpServer || 'rtmp://localhost:1935/live',
      streamKey: saved.streamKey || 'partido',
      customVideoUrl: finalUrl,
      chatMode: saved.chatMode || 'all',
      officialAnnouncement: saved.officialAnnouncement || 'Transmisión oficial de GolBolivia Live desde el Hernando Siles.',
      overlayScoreboardVisible: saved.overlayScoreboardVisible ?? true,
      lowLatencyMode: saved.lowLatencyMode ?? true,
    };
  });

  // Cross-tab synchronization: when /login updates the stream, the public view updates in real-time
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'golbolivia_stream_settings' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setStreamSettings((prev) => ({ ...prev, ...parsed }));
        } catch {}
      } else if (e.key === 'golbolivia_custom_video_url' && e.newValue) {
        setStreamSettings((prev) => ({
          ...prev,
          customVideoUrl: e.newValue!,
          broadcastMode: 'obs_custom',
        }));
      }
    };

    window.addEventListener('storage', handleStorage);

    let bc: BroadcastChannel | null = null;
    try {
      if ('BroadcastChannel' in window) {
        bc = new BroadcastChannel('gol_bolivia_live_chat_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'STREAM_SETTINGS_UPDATED' && event.data?.settings) {
            setStreamSettings((prev) => ({ ...prev, ...event.data.settings }));
          }
        };
      }
    } catch {}

    return () => {
      window.removeEventListener('storage', handleStorage);
      try {
        bc?.close();
      } catch {}
    };
  }, []);

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
    setStreamSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('golbolivia_stream_settings', JSON.stringify(updated));
          if (updated.customVideoUrl) {
            localStorage.setItem('golbolivia_custom_video_url', updated.customVideoUrl);
          }
        } catch {}
      }
      return updated;
    });

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('gol_bolivia_live_chat_channel');
        bc.postMessage({ type: 'STREAM_SETTINGS_UPDATED', settings: newSettings });
        bc.close();
      }
    } catch {}
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

  // Check if iframe real-time preview mode was requested
  const isPreviewOnly = typeof window !== 'undefined' && window.location.search.includes('preview=1');
  if (isPreviewOnly) {
    return (
      <div className="w-full h-full min-h-screen bg-[#060911] flex items-center justify-center p-0 m-0 overflow-hidden select-none">
        <StreamPlayer
          isTheaterMode={false}
          setIsTheaterMode={() => {}}
          openObsModal={() => {}}
          triggerReaction={() => {}}
          homeScore={homeScore}
          awayScore={awayScore}
          matchMinute={matchMinute}
          streamSettings={streamSettings}
        />
      </div>
    );
  }

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
        openAudienceModal={() => setIsAudienceModalOpen(true)}
        unreadNotificationsCount={unreadCount}
        isStreamingLive={isStreamingLive}
        isVipMember={isVipMember}
        toggleVipMembership={() => setIsVipMember(!isVipMember)}
        viewerCount={liveViewerCount}
        homeScore={homeScore}
        awayScore={awayScore}
        matchMinute={matchMinute}
      />

      {/* MAIN VIEWPORT BODY */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-5 md:p-6 pb-24 md:pb-8">
        {activeTab === 'stream' && (
          <div className="space-y-4 sm:space-y-5">
            {/* Split Grid for Stream & Chat */}
            <div
              className={`grid gap-5 ${
                isTheaterMode
                  ? 'grid-cols-1'
                  : 'grid-cols-1 lg:grid-cols-12 items-start'
              }`}
            >
              {/* VIDEO PLAYER COLUMN - ALWAYS ACTIVE & VISIBLE ON MOBILE & DESKTOP */}
              <div
                className={`${
                  isTheaterMode
                    ? 'w-full'
                    : 'lg:col-span-8'
                } w-full`}
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
                  viewerCount={liveViewerCount}
                />

                {/* Mobile View Toggle Buttons: Chat or Stats below the video player */}
                <div className="lg:hidden mt-3 p-1 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center gap-1">
                  <button
                    onClick={() => setMobileViewMode('chat')}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      mobileViewMode === 'chat' ? 'bg-slate-800 text-emerald-400 font-bold shadow-sm' : 'text-slate-400'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat en Directo</span>
                  </button>
                  <button
                    onClick={() => setMobileViewMode('stream')}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      mobileViewMode === 'stream' ? 'bg-slate-800 text-emerald-400 font-bold shadow-sm' : 'text-slate-400'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Estadísticas & Resumen</span>
                  </button>
                </div>

                {/* Match Information Bar underneath player */}
                <div className="mt-3 sm:mt-4 p-3.5 sm:p-4 rounded-xl bg-[#0a0f1d] border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
                <div className="mt-3 sm:mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
                  <div className="p-2.5 sm:p-3 rounded-xl bg-[#090e1b] border border-slate-800">
                    <span className="text-slate-400 text-[10px] sm:text-[11px]">Posesión Balón</span>
                    <div className="font-mono font-bold text-white text-xs sm:text-sm mt-0.5">56% - 44%</div>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-xl bg-[#090e1b] border border-slate-800">
                    <span className="text-slate-400 text-[10px] sm:text-[11px]">Tiros al Arco</span>
                    <div className="font-mono font-bold text-white text-xs sm:text-sm mt-0.5">7 - 4</div>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-xl bg-[#090e1b] border border-slate-800">
                    <span className="text-slate-400 text-[10px] sm:text-[11px]">Espectadores</span>
                    <div className="font-mono font-bold text-emerald-400 text-xs sm:text-sm mt-0.5">38.450 en vivo</div>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-xl bg-[#090e1b] border border-slate-800">
                    <span className="text-slate-400 text-[10px] sm:text-[11px]">Estadio y Altitud</span>
                    <div className="font-mono font-bold text-slate-300 text-xs sm:text-sm mt-0.5">
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
                    : 'lg:col-span-4'
                } ${mobileViewMode === 'stream' ? 'hidden lg:block lg:h-[620px]' : 'block h-[420px] sm:h-[480px] lg:h-[620px]'}`}
              >
                <LiveChat
                  onTriggerFloatingReaction={triggerReaction}
                  isVipMember={isVipMember}
                  chatMode={streamSettings.chatMode}
                  officialAnnouncement={streamSettings.officialAnnouncement}
                  activePoll={activePoll}
                  onVotePoll={handleUpdatePoll}
                  viewerCount={liveViewerCount}
                />
              </div>
            </div>

            {/* PWA Mobile App Download Prompt Banner */}
            <PWAInstallButton variant="banner" />

            {/* Official Social Media Follow Banner (Kick, YouTube, TikTok, Facebook) */}
            <SocialFollowBanner variant="cards" />

            {/* Embedded Live Stats Section underneath for easy browsing */}
            <div className="pt-2 sm:pt-4">
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

      {/* FOOTER WITH CREATOR PROFILE & SOCIAL LINKS */}
      <SocialFollowBanner variant="footer" />

      {/* ESSENTIAL PUSH NOTIFICATIONS MODAL */}
      <PushNotificationModal
        isOpen={isPushModalOpen}
        onClose={() => setIsPushModalOpen(false)}
        notifications={notifications}
        onTriggerSimulatedPush={handleTriggerSimulatedPush}
        onClearNotifications={() => setNotifications([])}
      />

      {/* REAL ON-SITE AUDIENCE METRICS MODAL */}
      <LiveAudienceModal
        isOpen={isAudienceModalOpen}
        onClose={() => setIsAudienceModalOpen(false)}
        presenceStats={presence}
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
