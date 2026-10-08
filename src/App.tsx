/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { UniversalStreamPlayer } from './features/player/UniversalStreamPlayer';
import { StreamPlayer } from './components/StreamPlayer';
import { LiveChat } from './components/LiveChat';
import { MatchStats } from './components/MatchStats';
import { ExclusiveClubZone } from './components/ExclusiveClubZone';
import { PushNotificationModal } from './components/PushNotificationModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ToastNotification } from './components/ToastNotification';
import { FloatingReactions, FloatingItem } from './components/FloatingReactions';
import { NotificationItem, StreamSettings, MatchEvent, LivePoll, ChatMessage, LiveEvent, StreamProvider } from './types/football';
import { BOLIVIAN_CLUBS, INITIAL_EVENTS, INITIAL_POLL } from './data/bolivianFootballData';
import { MessageSquare, Tv, Activity, ShieldCheck, Video, Flame, MapPin } from 'lucide-react';
import { SecretLoginPage } from './components/SecretLoginPage';
import { PWAInstallButton } from './components/PWAInstallButton';
import { SocialFollowBanner } from './components/SocialFollowBanner';
import { LiveAudienceModal } from './components/LiveAudienceModal';
import { useRealPresence } from './hooks/useRealPresence';
import { useClubs } from './hooks/useClubs';
import { apiClient } from './services/apiClient';
import { LiveEventsShowcase } from './components/LiveEventsShowcase';
import { getMatchSlug, findEventBySlug } from './utils/slug';
import { getStreamUrlForEvent, detectProviderFromUrl } from './utils/streamUtils';
import {
  subscribeScoreboardFirebase,
  subscribeMatchEventsFirebase,
  subscribeStreamSettingsFirebase,
  getStreamSettingsFromFirebase,
  DEFAULT_LIVE_EVENTS,
} from './services/firebase';

export default function App() {
  const { clubs } = useClubs();
  const [activeTab, setActiveTab] = useState<'stream' | 'stats' | 'exclusive'>('stream');
  const [mobileViewMode, setMobileViewMode] = useState<'stream' | 'chat'>('stream');
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [isAudienceModalOpen, setIsAudienceModalOpen] = useState(false);

  // Real-time live connected presence exclusively on this web & app
  const presence = useRealPresence(true);
  const liveViewerCount = presence.totalOnSite;

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
      const savedBackup = localStorage.getItem('golbolivia_backup_m3u8_url');
      if (savedBackup) saved.backupVideoUrl = savedBackup;
      const savedSource = localStorage.getItem('golbolivia_active_stream_source');
      if (savedSource) saved.activeStreamSource = savedSource as any;
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
      broadcastMode: saved.broadcastMode || (finalUrl ? 'obs_custom' : 'simulation'),
      customVideoUrl: finalUrl,
      backupVideoUrl: saved.backupVideoUrl || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      backupChannelName: saved.backupChannelName || 'GolBolivia 24/7 Señal HD',
      activeStreamSource: saved.activeStreamSource || 'obs',
      autoFailoverEnabled: saved.autoFailoverEnabled ?? true,
      chatMode: saved.chatMode || 'all',
      officialAnnouncement: saved.officialAnnouncement || 'Transmisión oficial de GolBolivia Live desde el Hernando Siles.',
      overlayScoreboardVisible: saved.overlayScoreboardVisible ?? false,
      lowLatencyMode: saved.lowLatencyMode ?? true,
    };
  });

  const sessionId = presence.currentSession?.sessionId;
  const sessionIdRef = useRef(sessionId);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Multi-Provider Live Events (Paso 9 & 10: Cloudflare, YouTube, Kick)
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>(() => {
    try {
      const saved = localStorage.getItem('golbolivia_live_events');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_LIVE_EVENTS;
  });
  const [activeEventId, setActiveEventId] = useState<string>('partido-001');

  const currentLiveEvent = liveEvents.find((e) => e.id === activeEventId) || liveEvents[0] || DEFAULT_LIVE_EVENTS[0];
  const currentHomeClub = (streamSettings && (clubs[streamSettings.homeClubId] || BOLIVIAN_CLUBS[streamSettings.homeClubId])) || BOLIVIAN_CLUBS.bolivar;
  const currentAwayClub = (streamSettings && (clubs[streamSettings.awayClubId] || BOLIVIAN_CLUBS[streamSettings.awayClubId])) || BOLIVIAN_CLUBS.strongest;

  // Authoritative Backend Synchronization: Dedicated Stream Sync, GET /api/live & SSE /api/events
  useEffect(() => {
    // 1. Fetch authoritative initial state from backend
    apiClient.getLiveState()
      .then((data) => {
        if (data.streamSettings) {
          setStreamSettings((prev) => {
            try {
              const local = localStorage.getItem('golbolivia_stream_settings');
              if (local) {
                const parsed = JSON.parse(local);
                return { ...prev, ...data.streamSettings, ...parsed };
              }
            } catch {}
            return { ...prev, ...data.streamSettings };
          });
        }
        if (data.scoreboard) {
          try {
            const local = localStorage.getItem('golbolivia_scoreboard');
            if (local) {
              const parsed = JSON.parse(local);
              if (typeof parsed.homeScore === 'number') setHomeScore(parsed.homeScore);
              if (typeof parsed.awayScore === 'number') setAwayScore(parsed.awayScore);
              if (typeof parsed.matchMinute === 'number') setMatchMinute(parsed.matchMinute);
              return;
            }
          } catch {}
          setHomeScore(data.scoreboard.homeScore);
          setAwayScore(data.scoreboard.awayScore);
          setMatchMinute(data.scoreboard.matchMinute);
        }
        if (data.events && data.events.length > 0) {
          setEvents(data.events);
        }
      })
      .catch(() => {
        // Fallback gracefully to default match state if offline
      });

    // 2. Dedicated Global M3U8 Stream & Failover Synchronization Subscriber
    const unsubscribeStream = apiClient.subscribeStreamSync((newConfig) => {
      setStreamSettings((prev) => {
        const isSwitchingToBackup =
          newConfig.activeStreamSource === 'backup' && prev.activeStreamSource !== 'backup';

        if (isSwitchingToBackup) {
          setActiveToast({
            id: `failover-${Date.now()}`,
            title: '📡 Señal de Respaldo HLS Activada',
            body: `Transmisión conectada a canal alternativo: ${newConfig.backupChannelName || 'GolBolivia 24/7 HD'}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'stream_start',
            read: false,
          });
        }

        return { ...prev, ...newConfig };
      });
    });

    // 3. Subscribe to Real-Time Server-Sent Events (SSE) for match & chat events
    const unsubscribeEvents = apiClient.subscribeLiveEvents((type, data) => {
      if (type === 'INITIAL_STATE') {
        if (data.streamSettings) {
          setStreamSettings((prev) => {
            try {
              const local = localStorage.getItem('golbolivia_stream_settings');
              if (local) {
                const parsed = JSON.parse(local);
                return { ...prev, ...data.streamSettings, ...parsed };
              }
            } catch {}
            return { ...prev, ...data.streamSettings };
          });
        }
        if (data.scoreboard) {
          try {
            const local = localStorage.getItem('golbolivia_scoreboard');
            if (local) {
              const parsed = JSON.parse(local);
              if (typeof parsed.homeScore === 'number') setHomeScore(parsed.homeScore);
              if (typeof parsed.awayScore === 'number') setAwayScore(parsed.awayScore);
              if (typeof parsed.matchMinute === 'number') setMatchMinute(parsed.matchMinute);
              return;
            }
          } catch {}
          setHomeScore(data.scoreboard.homeScore);
          setAwayScore(data.scoreboard.awayScore);
          setMatchMinute(data.scoreboard.matchMinute);
        }
        if (data.events) setEvents(data.events);
      } else if (type === 'STREAM_UPDATED' || type === 'STREAM_CONFIG_UPDATED') {
        setStreamSettings((prev) => ({ ...prev, ...data }));
      } else if (type === 'SCOREBOARD_UPDATED') {
        if (data.homeScore !== undefined) setHomeScore(data.homeScore);
        if (data.awayScore !== undefined) setAwayScore(data.awayScore);
        if (data.matchMinute !== undefined) setMatchMinute(data.matchMinute);
      } else if (type === 'MATCH_EVENT_ADDED') {
        setEvents((prev) => [data, ...prev]);
      } else if (type === 'MATCH_EVENT_UPDATED') {
        setEvents((prev) => prev.map((e) => (e.id === data.id ? { ...e, ...data } : e)));
      } else if (type === 'MATCH_EVENT_DELETED') {
        setEvents((prev) => prev.filter((e) => e.id !== data.id));
      }
    });

    // 4. Real-time Firebase Firestore Push Listeners (Authoritative Cloud State)
    const unsubscribeStreamSettingsFirebase = subscribeStreamSettingsFirebase((firebaseSettings) => {
      if (firebaseSettings && Object.keys(firebaseSettings).length > 0) {
        setStreamSettings((prev) => ({ ...prev, ...firebaseSettings }));
      }
    });

    // Initial Firestore check to ensure saved settings take precedence
    getStreamSettingsFromFirebase().then((savedFb) => {
      if (savedFb && Object.keys(savedFb).length > 0) {
        setStreamSettings((prev) => ({ ...prev, ...savedFb }));
      }
    }).catch(() => {});

    const unsubscribeScoreboardFirebase = subscribeScoreboardFirebase((scoreData) => {
      if (scoreData) {
        if (typeof scoreData.homeScore === 'number') setHomeScore(scoreData.homeScore);
        if (typeof scoreData.awayScore === 'number') setAwayScore(scoreData.awayScore);
        if (typeof scoreData.matchMinute === 'number') setMatchMinute(scoreData.matchMinute);
      }
    });

    const unsubscribeEventsFirebase = subscribeMatchEventsFirebase((firebaseEvents) => {
      if (firebaseEvents && firebaseEvents.length > 0) {
        setEvents(firebaseEvents);
      }
    });

    // 5. Heartbeat to report real active viewer session to server
    const heartbeatTimer = setInterval(() => {
      if (sessionIdRef.current) {
        apiClient.sendHeartbeat(sessionIdRef.current);
      }
    }, 15000);

    // 6. Multi-Provider Live Events subscription (Paso 9 & 10) with safe merge
    const unsubscribeMultiLiveEvents = apiClient.subscribeMultiLiveEvents((events) => {
      if (events && events.length > 0) {
        setLiveEvents((prev) => {
          const map = new Map<string, LiveEvent>();
          prev.forEach((e) => map.set(e.id, e));
          events.forEach((e) => map.set(e.id, e));
          const merged = Array.from(map.values());
          try { localStorage.setItem('golbolivia_live_events', JSON.stringify(merged)); } catch {}
          return merged;
        });
      }
    });

    apiClient.getLiveEvents().then((events) => {
      if (events && events.length > 0) {
        setLiveEvents((prev) => {
          const map = new Map<string, LiveEvent>();
          prev.forEach((e) => map.set(e.id, e));
          events.forEach((e) => map.set(e.id, e));
          const merged = Array.from(map.values());
          try { localStorage.setItem('golbolivia_live_events', JSON.stringify(merged)); } catch {}
          return merged;
        });
      }
    }).catch(() => {});

    return () => {
      unsubscribeStream();
      unsubscribeEvents();
      unsubscribeStreamSettingsFirebase();
      unsubscribeScoreboardFirebase();
      unsubscribeEventsFirebase();
      unsubscribeMultiLiveEvents();
      clearInterval(heartbeatTimer);
    };
  }, []);

  // Paso 12: Route detection for /live/bolivar-the-strongest, /live/blooming-oriente, etc.
  const prevActiveEventIdRef = useRef<string>(activeEventId);
  useEffect(() => {
    const handleUrlRoute = () => {
      if (typeof window === 'undefined') return;
      const path = window.location.pathname;
      const search = new URLSearchParams(window.location.search);
      const matchParam = search.get('match') || search.get('partido');

      let matched: LiveEvent | undefined;
      if (matchParam) {
        matched = liveEvents.find((e) => e.id === matchParam || getMatchSlug(e) === matchParam);
      } else if (path.includes('/live/')) {
        const slug = path.split('/live/')[1];
        matched = findEventBySlug(liveEvents, slug);
      }

      if (matched) {
        const isSwitchingMatch = prevActiveEventIdRef.current !== matched.id;
        prevActiveEventIdRef.current = matched.id;
        setActiveEventId(matched.id);
        if (isSwitchingMatch) {
          if (matched.homeScore !== undefined && matched.awayScore !== undefined) {
            setHomeScore(matched.homeScore);
            setAwayScore(matched.awayScore);
          }
          if (matched.matchMinute !== undefined) {
            setMatchMinute(matched.matchMinute);
          }
          const streamUrl = getStreamUrlForEvent(matched);
          if (streamUrl) {
            setStreamSettings((prev) => ({
              ...prev,
              title: matched.title,
              homeClubId: matched.homeTeam,
              awayClubId: matched.awayTeam,
              isLive: matched.isLive,
              tournamentName: matched.tournamentName || prev.tournamentName,
              customVideoUrl: streamUrl,
            }));
          }
        }
      }
    };

    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    return () => window.removeEventListener('popstate', handleUrlRoute);
  }, [liveEvents]);

  const handleSelectMatchEvent = (evt: LiveEvent) => {
    setActiveEventId(evt.id);
    const slug = getMatchSlug(evt);
    if (typeof window !== 'undefined' && window.history) {
      try {
        window.history.pushState(null, '', `/live/${slug}`);
      } catch {}
    }
    if (evt.homeScore !== undefined && evt.awayScore !== undefined) {
      setHomeScore(evt.homeScore);
      setAwayScore(evt.awayScore);
    }
    if (evt.matchMinute !== undefined) {
      setMatchMinute(evt.matchMinute);
    }
    const targetUrl = getStreamUrlForEvent(evt);
    setStreamSettings((prev) => ({
      ...prev,
      title: evt.title,
      homeClubId: evt.homeTeam,
      awayClubId: evt.awayTeam,
      isLive: evt.isLive,
      tournamentName: evt.tournamentName || prev.tournamentName,
      customVideoUrl: targetUrl || prev.customVideoUrl,
    }));
  };

  // Stream state
  const [isStreamingLive, setIsStreamingLive] = useState(true);
  const [isVipMember, setIsVipMember] = useState<boolean>(() => {
    try {
      return localStorage.getItem('golbolivia_vip_active') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleVip = (forcedState?: boolean) => {
    setIsVipMember((prev) => {
      const next = typeof forcedState === 'boolean' ? forcedState : !prev;
      try {
        localStorage.setItem('golbolivia_vip_active', next.toString());
      } catch {}
      return next;
    });
  };

  // Match live score & events
  const [homeScore, setHomeScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('golbolivia_scoreboard');
      if (saved) {
        const val = JSON.parse(saved).homeScore;
        if (typeof val === 'number') return val;
      }
    } catch {}
    return 2;
  });
  const [awayScore, setAwayScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('golbolivia_scoreboard');
      if (saved) {
        const val = JSON.parse(saved).awayScore;
        if (typeof val === 'number') return val;
      }
    } catch {}
    return 1;
  });
  const [matchMinute, setMatchMinute] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('golbolivia_scoreboard');
      if (saved) {
        const val = JSON.parse(saved).matchMinute;
        if (typeof val === 'number') return val;
      }
    } catch {}
    return 78;
  });
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
    presence.registerUserInteraction(`Reacción ${emoji}`);
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
      try {
        localStorage.setItem('golbolivia_stream_settings', JSON.stringify(updated));
        if (updated.customVideoUrl) localStorage.setItem('golbolivia_custom_video_url', updated.customVideoUrl);
        if (updated.backupVideoUrl) localStorage.setItem('golbolivia_backup_m3u8_url', updated.backupVideoUrl);
        if (updated.activeStreamSource) localStorage.setItem('golbolivia_active_stream_source', updated.activeStreamSource);
      } catch {}
      return updated;
    });

    // Synchronize current liveEvent in liveEvents array
    setLiveEvents((prev) => {
      const updated = prev.map((ev) => {
        if (ev.id !== activeEventId) return ev;
        const provider = newSettings.customVideoUrl ? detectProviderFromUrl(newSettings.customVideoUrl) : ev.primaryProvider;
        return {
          ...ev,
          title: newSettings.title || ev.title,
          homeTeam: newSettings.homeClubId || ev.homeTeam,
          awayTeam: newSettings.awayClubId || ev.awayTeam,
          tournamentName: newSettings.tournamentName || ev.tournamentName,
          stadiumName: newSettings.stadiumName || ev.stadiumName,
          period: newSettings.period || ev.period,
          primaryProvider: provider,
          cloudflare: provider === 'cloudflare' && newSettings.customVideoUrl
            ? { liveInputId: ev.cloudflare?.liveInputId || '', playbackUrl: newSettings.customVideoUrl }
            : ev.cloudflare,
          youtube: provider === 'youtube' && newSettings.customVideoUrl
            ? { videoId: newSettings.customVideoUrl.replace(/^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)/, '') }
            : ev.youtube,
          kick: provider === 'kick' && newSettings.customVideoUrl
            ? { channel: newSettings.customVideoUrl.replace(/^https?:\/\/(?:www\.)?kick\.com\//, '') }
            : ev.kick,
        };
      });
      try {
        localStorage.setItem('golbolivia_live_events', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Push authoritative global update to dedicated backend endpoint & Firebase
    apiClient.syncStreamConfig(newSettings).catch((err) => {
      console.error('Error al sincronizar señal global:', err);
    });
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
          homeScore={homeScore}
          awayScore={awayScore}
          matchMinute={matchMinute}
          streamSettings={streamSettings}
          viewerCount={liveViewerCount}
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
        activeEventId={activeEventId}
        onSelectActiveEventId={(id) => setActiveEventId(id)}
        onUpdateScore={(h, a) => {
          const safeH = Math.max(0, Math.min(50, Math.round(h)));
          const safeA = Math.max(0, Math.min(50, Math.round(a)));
          setHomeScore(safeH);
          setAwayScore(safeA);
          try {
            const sb = { homeScore: safeH, awayScore: safeA, matchMinute, period: streamSettings.period, updatedAt: Date.now() };
            localStorage.setItem('golbolivia_scoreboard', JSON.stringify(sb));
          } catch {}
          setLiveEvents((prev) => {
            const updated = prev.map((ev) =>
              ev.id === activeEventId ? { ...ev, homeScore: safeH, awayScore: safeA } : ev
            );
            try {
              localStorage.setItem('golbolivia_live_events', JSON.stringify(updated));
            } catch {}
            return updated;
          });
          apiClient.updateScoreboard({ homeScore: safeH, awayScore: safeA, activeEventId }).catch(() => {});
        }}
        onUpdateMinute={(m) => {
          const safeM = Math.max(0, Math.min(130, Math.round(m)));
          setMatchMinute(safeM);
          try {
            const sb = { homeScore, awayScore, matchMinute: safeM, period: streamSettings.period, updatedAt: Date.now() };
            localStorage.setItem('golbolivia_scoreboard', JSON.stringify(sb));
          } catch {}
          setLiveEvents((prev) => {
            const updated = prev.map((ev) =>
              ev.id === activeEventId ? { ...ev, matchMinute: safeM } : ev
            );
            try {
              localStorage.setItem('golbolivia_live_events', JSON.stringify(updated));
            } catch {}
            return updated;
          });
          apiClient.updateScoreboard({ matchMinute: safeM, activeEventId }).catch(() => {});
        }}
        onUpdateLiveEvent={(data) => {
          setLiveEvents((prev) => {
            const updated = prev.map((ev) =>
              ev.id === activeEventId ? { ...ev, ...data } : ev
            );
            try {
              localStorage.setItem('golbolivia_live_events', JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }}
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
        presenceStats={presence}
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
        viewerCount={presence.totalOnSite}
        activeCount={presence.activeInteracting}
        totalCount={presence.totalOnSite}
        homeScore={homeScore}
        awayScore={awayScore}
        matchMinute={matchMinute}
        homeClub={currentHomeClub}
        awayClub={currentAwayClub}
        period={streamSettings.period}
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
                {/* Clean Multi-Match Selector (Only if multiple live matches exist) */}
                {liveEvents.length > 1 && (
                  <div className="mb-2.5 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap hidden sm:inline">
                      Partidos:
                    </span>
                    {liveEvents.map((evt) => {
                      const isSelected = evt.id === activeEventId;
                      return (
                        <button
                          key={evt.id}
                          onClick={() => handleSelectMatchEvent(evt)}
                          className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-slate-800 text-white border-emerald-500/80 shadow-md ring-1 ring-emerald-500/40 font-bold'
                              : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-850'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${evt.isLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                          <span>{evt.title}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

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

                {/* MARCADOR OFICIAL EN PORTADA & INFORMACIÓN DEL PARTIDO */}
                <div className="mt-3 sm:mt-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#0b1222] via-[#090f1d] to-[#060a14] border-2 border-slate-800 shadow-2xl space-y-4">
                  {/* Tournament & Badges Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>EN VIVO</span>
                      </span>
                      <span className="font-semibold text-white">{streamSettings.tournamentName}</span>
                      <span className="text-slate-500 hidden sm:inline">·</span>
                      <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">HD</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {streamSettings.period || '2T'} · {matchMinute}&apos;
                      </span>
                      <button
                        onClick={() => setActiveTab('stats')}
                        className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-colors"
                      >
                        <Activity className="w-3.5 h-3.5 text-yellow-400" />
                        <span className="hidden sm:inline">Estadísticas</span>
                      </button>
                    </div>
                  </div>

                  {/* Main Match Title */}
                  <h1 className="font-display font-black text-lg sm:text-xl md:text-2xl text-white tracking-tight">
                    {streamSettings.title}
                  </h1>

                  {/* Live Scoreboard Hero Display */}
                  <div className="bg-[#050811] rounded-xl p-3 sm:p-4 border border-slate-800 flex items-center justify-between gap-2">
                    {/* Home Team */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl sm:text-2xl shadow-lg shrink-0 border border-white/20"
                        style={{ backgroundColor: currentHomeClub.primaryColor }}
                      >
                        {currentHomeClub.badgeEmoji}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-black text-white block truncate">
                          {currentHomeClub.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {currentHomeClub.city} · Anfitrión
                        </span>
                      </div>
                    </div>

                    {/* Central Score */}
                    <div className="flex flex-col items-center justify-center px-3 sm:px-6">
                      <div className="font-mono text-2xl sm:text-4xl font-black text-emerald-400 tracking-wider tabular-nums bg-black/60 px-3 sm:px-4 py-1 rounded-xl border border-slate-700 shadow-inner">
                        {homeScore} <span className="text-slate-500 font-light">-</span> {awayScore}
                      </div>
                      <span className="text-[10px] text-amber-400 font-mono font-bold mt-1 uppercase tracking-wider">
                        {streamSettings.period || '2T'} ({matchMinute}&apos;)
                      </span>
                    </div>

                    {/* Away Team */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 justify-end text-right">
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-black text-white block truncate">
                          {currentAwayClub.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {currentAwayClub.city} · Visitante
                        </span>
                      </div>
                      <div
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl sm:text-2xl shadow-lg shrink-0 border border-white/20"
                        style={{ backgroundColor: currentAwayClub.primaryColor }}
                      >
                        {currentAwayClub.badgeEmoji}
                      </div>
                    </div>
                  </div>

                  {/* Venue / Stadium & Broadcast Announcement */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400 pt-1">
                    <div className="flex items-center gap-1.5 font-medium text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>{streamSettings.stadiumName}</span>
                      <span>·</span>
                      <span className="font-mono text-amber-400">{streamSettings.altitudeMeters} m s.n.m.</span>
                    </div>

                    {streamSettings.officialAnnouncement && (
                      <div className="text-[11px] text-slate-400 italic truncate max-w-md">
                        📢 {streamSettings.officialAnnouncement}
                      </div>
                    )}
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
            toggleVipMembership={handleToggleVip}
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

      {/* AUDIENCE MODAL FOR PUBLIC VIEWERS */}
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
