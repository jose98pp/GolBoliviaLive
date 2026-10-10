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
import { NotificationItem, StreamSettings, MatchEvent, LivePoll, ChatMessage, LiveEvent, StreamProvider, DonationQrInfo } from './types/football';
import { BOLIVIAN_CLUBS, INITIAL_EVENTS, INITIAL_POLL } from './data/bolivianFootballData';
import { MessageSquare, Tv, Activity, ShieldCheck, Video, Flame, MapPin } from 'lucide-react';
import { SecretLoginPage } from './components/SecretLoginPage';
import { DonationQrModal } from './components/DonationQrModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { SocialFollowBanner } from './components/SocialFollowBanner';
import { LiveAudienceModal } from './components/LiveAudienceModal';
import { useRealPresence } from './hooks/useRealPresence';
import { useClubs } from './hooks/useClubs';
import { apiClient } from './services/apiClient';
import { LiveEventsShowcase } from './components/LiveEventsShowcase';
import { getMatchSlug, findEventBySlug } from './utils/slug';
import {
  subscribeScoreboardFirebase,
  subscribeMatchEventsFirebase,
  subscribeStreamSettingsFirebase,
  getStreamSettingsFromFirebase,
  DEFAULT_LIVE_EVENTS,
  subscribeDonationQrFirebase,
  getDonationQrFromFirebase,
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
      : '';

    return {
      title: saved.title || '',
      tournamentName: saved.tournamentName || '',
      homeClubId: saved.homeClubId || '',
      awayClubId: saved.awayClubId || '',
      stadiumName: saved.stadiumName || '',
      altitudeMeters: saved.altitudeMeters || 0,
      period: saved.period || '1T',
      isLive: saved.isLive ?? true,
      broadcastMode: saved.broadcastMode || (finalUrl ? 'obs_custom' : 'simulation'),
      customVideoUrl: finalUrl,
      backupVideoUrl: saved.backupVideoUrl || '',
      backupChannelName: saved.backupChannelName || 'GolBolivia HD',
      activeStreamSource: saved.activeStreamSource || 'obs',
      autoFailoverEnabled: saved.autoFailoverEnabled ?? true,
      chatMode: saved.chatMode || 'all',
      officialAnnouncement: saved.officialAnnouncement || '',
      overlayScoreboardVisible: saved.overlayScoreboardVisible ?? false,
      lowLatencyMode: saved.lowLatencyMode ?? true,
    };
  });

  const sessionId = presence.currentSession?.sessionId;
  const sessionIdRef = useRef(sessionId);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Multi-Provider Live Events (Cloudflare, YouTube, Kick)
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>(() => {
    try {
      const saved = localStorage.getItem('golbolivia_live_events');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [DEFAULT_LIVE_EVENTS[0]];
  });
  const [activeEventId, setActiveEventId] = useState<string>('partido-001');
  const activeEventIdRef = useRef(activeEventId);
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [donationQrInfo, setDonationQrInfo] = useState<DonationQrInfo | undefined>(undefined);
  useEffect(() => {
    activeEventIdRef.current = activeEventId;
  }, [activeEventId]);

  const defaultFallbackClub = Object.values(BOLIVIAN_CLUBS)[0] || {
    id: 'bolivar',
    name: 'Club Bolívar',
    shortName: 'BOL',
    city: 'La Paz',
    primaryColor: '#0099e6',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    badgeEmoji: '🔵',
    stadium: 'Estadio Hernando Siles',
    altitudeMeters: 3637,
  };
  const defaultAwayClub = Object.values(BOLIVIAN_CLUBS)[1] || {
    id: 'strongest',
    name: 'The Strongest',
    shortName: 'STR',
    city: 'La Paz',
    primaryColor: '#ffcc00',
    secondaryColor: '#000000',
    textColor: '#000000',
    badgeEmoji: '🟡',
    stadium: 'Estadio Rafael Mendoza Castellón',
    altitudeMeters: 3600,
  };

  const currentLiveEvent = liveEvents.find((e) => e.id === activeEventId) || liveEvents[0] || DEFAULT_LIVE_EVENTS[0];
  const currentHomeClub = (currentLiveEvent?.homeTeam && (clubs[currentLiveEvent.homeTeam] || BOLIVIAN_CLUBS[currentLiveEvent.homeTeam]))
    || (streamSettings?.homeClubId && (clubs[streamSettings.homeClubId] || BOLIVIAN_CLUBS[streamSettings.homeClubId]))
    || Object.values(clubs)[0]
    || defaultFallbackClub;
  const currentAwayClub = (currentLiveEvent?.awayTeam && (clubs[currentLiveEvent.awayTeam] || BOLIVIAN_CLUBS[currentLiveEvent.awayTeam]))
    || (streamSettings?.awayClubId && (clubs[streamSettings.awayClubId] || BOLIVIAN_CLUBS[streamSettings.awayClubId]))
    || Object.values(clubs)[1]
    || defaultAwayClub;

  // Problema 2: Derivar el marcador visible directamente del evento confirmado más reciente, sin estado duplicado
  const currentHomeScore = typeof currentLiveEvent?.homeScore === 'number' ? currentLiveEvent.homeScore : 0;
  const currentAwayScore = typeof currentLiveEvent?.awayScore === 'number' ? currentLiveEvent.awayScore : 0;
  const currentMatchMinute = typeof currentLiveEvent?.matchMinute === 'number' ? currentLiveEvent.matchMinute : 0;
  const currentPeriod = currentLiveEvent?.period || streamSettings?.period || '1T';

  // Authoritative Backend Synchronization: Dedicated Match-Specific Stream Sync, GET /api/live & SSE /api/events
  useEffect(() => {
    // 1. Fetch authoritative initial state from backend
    apiClient.getLiveState()
      .then((data) => {
        if (data.streamSettings) {
          setStreamSettings((prev) => ({ ...prev, ...data.streamSettings }));
          try {
            localStorage.setItem('golbolivia_stream_settings', JSON.stringify(data.streamSettings));
          } catch {}
        }
        if (data.events && data.events.length > 0) {
          setEvents(data.events);
        }
        if (data.stream?.donationQr) {
          setDonationQrInfo(data.stream.donationQr);
        } else if (data.streamSettings?.donationQr) {
          setDonationQrInfo(data.streamSettings.donationQr);
        }
      })
      .catch(() => {
        // Fallback gracefully if offline
      });

    // 1.1 Cargar y sincronizar datos del QR de donación desde Firebase y servidor
    getDonationQrFromFirebase().then((qr) => {
      if (qr && qr.imageUrl) setDonationQrInfo(qr);
    }).catch(() => {});

    apiClient.getDonationQr().then((qr) => {
      if (qr && qr.imageUrl) setDonationQrInfo(qr);
    });

    const unsubscribeDonationQr = subscribeDonationQrFirebase((qr) => {
      if (qr && qr.imageUrl) {
        setDonationQrInfo(qr);
      }
    });

    // 2. Dedicated Match-Scoped Stream & Failover Synchronization Subscriber
    const unsubscribeStream = apiClient.subscribeStreamSync((newConfig) => {
      const targetId = newConfig.eventId;
      // Problema 3: Exigir eventId para configuraciones de transmisión específicas de un partido
      if (!targetId) return;

      setLiveEvents((prev) =>
        prev.map((ev) => (ev.id === targetId ? { ...ev, ...newConfig } : ev))
      );

      if (targetId === activeEventIdRef.current) {
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
      }
    });

    // Helper para Regla 3: Rechazar datos antiguos usando versión o marca de actualización
    const mergeConfirmedEvents = (prevList: LiveEvent[], incomingList: LiveEvent[]): LiveEvent[] => {
      const result = [...prevList];
      for (const inc of incomingList) {
        const idx = result.findIndex((e) => e.id === inc.id);
        if (idx >= 0) {
          const current = result[idx];
          const curVer = typeof current.version === 'number' ? current.version : 0;
          const incVer = typeof inc.version === 'number' ? inc.version : 0;
          const curUp = current.updatedAt || 0;
          const incUp = inc.updatedAt || 0;
          // Regla 3 & Problema 5: Rechazar datos antiguos por versión o fecha
          if (incVer > curVer) {
            result[idx] = { ...current, ...inc };
          } else if (incVer === curVer && incUp >= curUp) {
            result[idx] = { ...current, ...inc };
          }
        } else {
          result.push(inc);
        }
      }
      return result;
    };

    // 3. Subscribe to Real-Time Server-Sent Events (SSE) strictly matching each event to its match
    const unsubscribeEvents = apiClient.subscribeLiveEvents((type, data) => {
      if (type === 'INITIAL_STATE') {
        if (Array.isArray(data.liveEvents) && data.liveEvents.length > 0) {
          setLiveEvents((prev) => (data.liveEvents.length < prev.length ? data.liveEvents : mergeConfirmedEvents(prev, data.liveEvents)));
        }
        if (data.events) setEvents(data.events);
        if (data.stream?.donationQr) {
          setDonationQrInfo(data.stream.donationQr);
        } else if (data.streamSettings?.donationQr) {
          setDonationQrInfo(data.streamSettings.donationQr);
        }
      } else if (type === 'DONATION_QR_UPDATED') {
        if (data) setDonationQrInfo(data);
      } else if (type === 'STREAM_UPDATED' || type === 'STREAM_CONFIG_UPDATED') {
        const targetId = data.eventId;
        // Problema 3: Exigir eventId para configuraciones específicas de un partido
        if (targetId) {
          setLiveEvents((prev) =>
            prev.map((ev) => {
              if (ev.id !== targetId) return ev;
              const curVer = typeof ev.version === 'number' ? ev.version : 0;
              const incVer = typeof data.version === 'number' ? data.version : 0;
              if (incVer > 0 && incVer < curVer) return ev;
              return { ...ev, ...data };
            })
          );
          if (targetId === activeEventIdRef.current) {
            setStreamSettings((prev) => ({ ...prev, ...data }));
          }
        }
      } else if (type === 'SCOREBOARD_UPDATED') {
        const targetId = data.eventId || activeEventIdRef.current;
        setLiveEvents((prev) =>
          prev.map((ev) => {
            if (ev.id !== targetId) return ev;
            // Regla 3 & Problema 5: Rechazar datos antiguos
            const curVer = typeof ev.version === 'number' ? ev.version : 0;
            const incVer = typeof data.version === 'number' ? data.version : 0;
            const curUp = ev.updatedAt || 0;
            const incUp = data.updatedAt || 0;
            if (incVer > 0 && incVer < curVer) return ev;
            if (incVer === curVer && incUp > 0 && incUp < curUp) return ev;

            return {
              ...ev,
              ...(data.homeScore !== undefined && { homeScore: data.homeScore }),
              ...(data.awayScore !== undefined && { awayScore: data.awayScore }),
              ...(data.matchMinute !== undefined && { matchMinute: data.matchMinute }),
              ...(data.period !== undefined && { period: data.period }),
              ...(data.isClockRunning !== undefined && { isClockRunning: data.isClockRunning }),
              ...(data.version !== undefined && { version: data.version }),
              ...(data.updatedAt !== undefined && { updatedAt: data.updatedAt }),
            };
          })
        );
      } else if (type === 'LIVE_EVENT_DELETED') {
        const deletedId = (data as any)?.id;
        if (deletedId) {
          setLiveEvents((prev) => {
            const filtered = prev.filter((e) => e.id !== deletedId);
            try {
              localStorage.setItem('golbolivia_live_events', JSON.stringify(filtered));
            } catch {}
            return filtered;
          });
        }
      } else if (type === 'LIVE_EVENTS_UPDATED') {
        if (Array.isArray(data)) {
          setLiveEvents((prev) => {
            const merged = (data.length < prev.length) ? data : mergeConfirmedEvents(prev, data);
            try {
              localStorage.setItem('golbolivia_live_events', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      } else if (type === 'MATCH_EVENT_ADDED') {
        setEvents((prev) => [data, ...prev]);
      } else if (type === 'MATCH_EVENT_UPDATED') {
        setEvents((prev) => prev.map((e) => (e.id === data.id ? { ...e, ...data } : e)));
      } else if (type === 'MATCH_EVENT_DELETED') {
        setEvents((prev) => prev.filter((e) => e.id !== data.id));
      }
    });

    // 4. Real-time Firebase Firestore Push Listeners: Listen to liveEvents collection (Fuente única de datos reales por partido)
    const unsubscribeMultiLiveEvents = apiClient.subscribeMultiLiveEvents((fbEvents) => {
      if (fbEvents && Array.isArray(fbEvents) && fbEvents.length > 0) {
        setLiveEvents((prev) => {
          const merged = fbEvents.length < prev.length ? fbEvents : mergeConfirmedEvents(prev, fbEvents);
          try {
            localStorage.setItem('golbolivia_live_events', JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    });

    // Carga inicial sincronizada desde el backend
    apiClient.getLiveEvents().then((evts) => {
      if (evts && Array.isArray(evts) && evts.length > 0) {
        setLiveEvents((prev) => {
          const merged = evts.length < prev.length ? evts : mergeConfirmedEvents(prev, evts);
          try {
            localStorage.setItem('golbolivia_live_events', JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    }).catch(() => {});

    // 5. Heartbeat to report real active viewer session to server
    const heartbeatTimer = setInterval(() => {
      if (sessionIdRef.current) {
        apiClient.sendHeartbeat(sessionIdRef.current);
      }
    }, 15000);

    return () => {
      unsubscribeStream();
      unsubscribeEvents();
      unsubscribeMultiLiveEvents();
      unsubscribeDonationQr();
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
        prevActiveEventIdRef.current = matched.id;
        setActiveEventId(matched.id);
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
    setStreamSettings((prev) => ({
      ...prev,
      title: evt.title,
      homeClubId: evt.homeTeam,
      awayClubId: evt.awayTeam,
      isLive: evt.isLive,
      tournamentName: evt.tournamentName || prev.tournamentName,
      stadiumName: evt.stadiumName || prev.stadiumName,
      period: evt.period || prev.period,
      customVideoUrl: evt.customVideoUrl || evt.cloudflare?.playbackUrl || prev.customVideoUrl,
      backupVideoUrl: evt.backupVideoUrl || prev.backupVideoUrl,
      backupChannelName: evt.backupChannelName || prev.backupChannelName,
      activeStreamSource: evt.activeStreamSource || prev.activeStreamSource,
      autoFailoverEnabled: evt.autoFailoverEnabled ?? prev.autoFailoverEnabled,
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

  const [events, setEvents] = useState<MatchEvent[]>(() => {
    try {
      const saved = localStorage.getItem('golbolivia_match_events');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('golbolivia_match_events', JSON.stringify(events));
    } catch {}
  }, [events]);

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
  const [matchSeconds, setMatchSeconds] = useState<number>(0);

  // Función principal para iniciar/pausar el reloj automático desde el dashboard
  const handleToggleMatchClock = (explicitRunning?: boolean) => {
    const isCurrentlyRunning = Boolean(currentLiveEvent?.isClockRunning);
    const targetRunning = explicitRunning !== undefined ? explicitRunning : !isCurrentlyRunning;
    const prevRunning = isCurrentlyRunning;

    setLiveEvents((prev) =>
      prev.map((ev) =>
        ev.id === activeEventId ? { ...ev, isClockRunning: targetRunning, clockUpdatedAt: Date.now() } : ev
      )
    );

    apiClient
      .updateScoreboard({
        activeEventId,
        isClockRunning: targetRunning,
        homeScore: currentHomeScore,
        awayScore: currentAwayScore,
        matchMinute: currentMatchMinute,
        version: currentLiveEvent?.version ? currentLiveEvent.version + 1 : undefined,
        force: true,
      })
      .then((res) => {
        if (res.scoreboard?.version) {
          setLiveEvents((prev) =>
            prev.map((ev) => (ev.id === activeEventId ? { ...ev, version: res.scoreboard.version } : ev))
          );
        }
        setActiveToast({
          id: `clock-ok-${Date.now()}`,
          title: '✅ Marcador en Marcha',
          body: targetRunning
            ? '▶ Cronómetro automático iniciado desde el dashboard: avanza en tiempo real para todos.'
            : '⏸ Cronómetro pausado desde el dashboard.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'exclusive',
          read: false,
        });
      })
      .catch((err: any) => {
        // Revertir si falló
        setLiveEvents((prev) =>
          prev.map((ev) => (ev.id === activeEventId ? { ...ev, isClockRunning: prevRunning } : ev))
        );
        setActiveToast({
          id: `clock-err-${Date.now()}`,
          title: '❌ Error al sincronizar reloj',
          body: err.message || 'No autorizado o error de conexión al sincronizar el reloj',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'exclusive',
          read: false,
        });
      });
  };

  const isClockActive = Boolean(currentLiveEvent?.isClockRunning);
  const currentPeriodStatus = currentLiveEvent?.period;

  // Reloj oficial del partido: avanza segundos y minutos automáticamente cuando está activo desde el dashboard
  useEffect(() => {
    if (!isClockActive) {
      setMatchSeconds(0);
      return;
    }
    if (currentPeriodStatus === 'Descanso' || currentPeriodStatus === 'Finalizado') {
      return;
    }

    const timer = setInterval(() => {
      setMatchSeconds((prevSec) => {
        const nextSec = prevSec + 1;
        if (nextSec >= 60) {
          // Ha transcurrido 1 minuto completo: avanzar minuto automáticamente
          setLiveEvents((prevEvents) =>
            prevEvents.map((ev) => {
              if (ev.id === activeEventId) {
                const nextMin = (ev.matchMinute || 0) + 1;
                if (nextMin <= 130) {
                  const updated = { ...ev, matchMinute: nextMin };
                  try {
                    localStorage.setItem(
                      'golbolivia_live_events',
                      JSON.stringify(prevEvents.map((p) => (p.id === ev.id ? updated : p)))
                    );
                  } catch {}
                  return updated;
                }
              }
              return ev;
            })
          );
          return 0; // Reiniciar contador de segundos
        }
        return nextSec;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeEventId, isClockActive, currentPeriodStatus]);

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
      const updated = prev.map((ev) =>
        ev.id === activeEventId
          ? {
              ...ev,
              title: newSettings.title || ev.title,
              homeTeam: newSettings.homeClubId || ev.homeTeam,
              awayTeam: newSettings.awayClubId || ev.awayTeam,
              tournamentName: newSettings.tournamentName || ev.tournamentName,
              stadiumName: newSettings.stadiumName || ev.stadiumName,
              period: newSettings.period || ev.period,
              customVideoUrl: newSettings.customVideoUrl || ev.customVideoUrl,
              backupVideoUrl: newSettings.backupVideoUrl || ev.backupVideoUrl,
              activeStreamSource: newSettings.activeStreamSource || ev.activeStreamSource,
              autoFailoverEnabled: newSettings.autoFailoverEnabled ?? ev.autoFailoverEnabled,
            }
          : ev
      );
      try {
        localStorage.setItem('golbolivia_live_events', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Push authoritative match-specific update to dedicated backend endpoint & Firebase
    apiClient.syncStreamConfig({ ...newSettings, activeEventId, eventId: activeEventId }).catch((err) => {
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

  const handleClearEvents = () => {
    setEvents([]);
    try {
      localStorage.removeItem('golbolivia_match_events');
    } catch {}
    apiClient.clearAllMatchEvents().catch(() => {});
    setActiveToast({
      id: `events-cleared-${Date.now()}`,
      title: '🗑️ Cronología limpiada',
      body: 'Se vaciaron todos los eventos del partido anterior con éxito.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'exclusive',
      read: false,
    });
  };

  const handleClearChat = () => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('gol_bolivia_live_chat_channel');
        bc.postMessage({ type: 'CLEAR_CHAT' });
        bc.close();
      }
      localStorage.removeItem('golbolivia_real_chat_messages');
    } catch {}
    apiClient.clearAllChatMessages().catch(() => {});
    setActiveToast({
      id: `chat-cleared-${Date.now()}`,
      title: '🗑️ Chat limpiado',
      body: 'Se borraron los mensajes del chat en vivo con éxito.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'exclusive',
      read: false,
    });
  };

  const handleDeleteLiveEvent = async (id: string) => {
    try {
      await apiClient.deleteLiveEvent(id);
    } catch (err: any) {
      console.warn('[App] Advertencia al eliminar partido en servidor/Firebase:', err.message || err);
    }

    setLiveEvents((prev) => {
      const remaining = prev.filter((e) => e.id !== id);
      try {
        localStorage.setItem('golbolivia_live_events', JSON.stringify(remaining));
      } catch {}
      return remaining;
    });

    if (activeEventId === id) {
      setLiveEvents((prev) => {
        const next = prev.find((e) => e.id !== id) || prev[0];
        if (next) {
          setActiveEventId(next.id);
          setStreamSettings((s) => ({
            ...s,
            title: next.title,
            homeClubId: next.homeTeam,
            awayClubId: next.awayTeam,
            tournamentName: next.tournamentName || s.tournamentName || '',
            stadiumName: next.stadiumName || s.stadiumName || '',
            period: (next.period as any) || s.period || '1T',
            homeScore: next.homeScore ?? s.homeScore,
            awayScore: next.awayScore ?? s.awayScore,
          }));
        }
        return prev;
      });
    }

    setActiveToast({
      id: `match-del-${Date.now()}`,
      title: '🗑️ Partido Eliminado',
      body: 'El partido ha sido eliminado exitosamente del panel.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'exclusive',
      read: false,
    });
  };

  // Check if iframe real-time preview mode was requested
  const isPreviewOnly = typeof window !== 'undefined' && window.location.search.includes('preview=1');
  if (isPreviewOnly) {
    return (
      <div className="w-full h-full min-h-screen bg-[#060911] flex items-center justify-center p-0 m-0 overflow-hidden select-none">
        <UniversalStreamPlayer
          event={currentLiveEvent}
          isTheaterMode={false}
          setIsTheaterMode={() => {}}
          homeScore={currentHomeScore}
          awayScore={currentAwayScore}
          matchMinute={currentMatchMinute}
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
        homeScore={currentHomeScore}
        awayScore={currentAwayScore}
        matchMinute={currentMatchMinute}
        activeEventId={activeEventId}
        liveEvents={liveEvents}
        onSelectEvent={(id) => {
          setActiveEventId(id);
          const ev = liveEvents.find((e) => e.id === id);
          if (ev) handleSelectMatchEvent(ev);
        }}
        isClockRunning={Boolean(currentLiveEvent?.isClockRunning)}
        onToggleMatchClock={handleToggleMatchClock}
        onUpdatePeriod={(p) => {
          const prevPeriod = currentLiveEvent?.period || streamSettings.period || '1T';
          setLiveEvents((prev) =>
            prev.map((ev) =>
              ev.id === activeEventId ? { ...ev, period: p as any } : ev
            )
          );
          setStreamSettings((prev) => ({ ...prev, period: p as any }));
          apiClient.updateScoreboard({
            activeEventId,
            period: p,
            homeScore: currentHomeScore,
            awayScore: currentAwayScore,
            matchMinute: currentMatchMinute,
            version: currentLiveEvent?.version ? currentLiveEvent.version + 1 : undefined,
          }).then((res) => {
            if (res.scoreboard?.version) {
              setLiveEvents((prev) =>
                prev.map((ev) =>
                  ev.id === activeEventId ? { ...ev, version: res.scoreboard.version } : ev
                )
              );
            }
            setActiveToast({
              id: `period-ok-${Date.now()}`,
              title: '✅ Guardado confirmado',
              body: `Periodo "${p}" guardado en servidor y Firestore`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              type: 'exclusive',
              read: false,
            });
          }).catch((err: any) => {
            // Revertir estado si falló
            setLiveEvents((prev) =>
              prev.map((ev) =>
                ev.id === activeEventId ? { ...ev, period: prevPeriod as any } : ev
              )
            );
            setStreamSettings((prev) => ({ ...prev, period: prevPeriod as any }));
            setActiveToast({
              id: `period-err-${Date.now()}`,
              title: '❌ Error al guardar',
              body: err.message || 'No autorizado para cambiar periodo',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              type: 'exclusive',
              read: false,
            });
          });
        }}
        onUpdateScore={(h, a) => {
          const safeH = Math.max(0, Math.min(50, Math.round(h)));
          const safeA = Math.max(0, Math.min(50, Math.round(a)));
          const currentEv = liveEvents.find((e) => e.id === activeEventId);
          const currentVer = typeof currentEv?.version === 'number' ? currentEv.version : 1;
          const nextVer = currentVer + 1;
          const prevEvents = liveEvents;

          setLiveEvents((prev) =>
            prev.map((ev) =>
              ev.id === activeEventId ? { ...ev, homeScore: safeH, awayScore: safeA, version: nextVer } : ev
            )
          );
          apiClient.updateScoreboard({ homeScore: safeH, awayScore: safeA, activeEventId, version: nextVer })
            .then((res) => {
              if (res.scoreboard?.version) {
                setLiveEvents((prev) =>
                  prev.map((ev) =>
                    ev.id === activeEventId ? { ...ev, version: res.scoreboard.version } : ev
                  )
                );
              }
              setActiveToast({
                id: `score-ok-${Date.now()}`,
                title: '✅ Guardado confirmado',
                body: `Marcador oficial ${safeH} - ${safeA} sincronizado en Firestore`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'exclusive',
                read: false,
              });
            })
            .catch((err: any) => {
              // Revertir en fallo: no confirmar guardados fallidos
              setLiveEvents(prevEvents);
              setActiveToast({
                id: `score-err-${Date.now()}`,
                title: '❌ Error al guardar marcador',
                body: err.message || 'No autorizado o error al guardar marcador',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'exclusive',
                read: false,
              });
            });
        }}
        onUpdateMinute={(m) => {
          const safeM = Math.max(0, Math.min(130, Math.round(m)));
          const currentEv = liveEvents.find((e) => e.id === activeEventId);
          const currentVer = typeof currentEv?.version === 'number' ? currentEv.version : 1;
          const nextVer = currentVer + 1;
          const prevEvents = liveEvents;

          setLiveEvents((prev) =>
            prev.map((ev) =>
              ev.id === activeEventId ? { ...ev, matchMinute: safeM, version: nextVer } : ev
            )
          );
          apiClient.updateScoreboard({ matchMinute: safeM, activeEventId, version: nextVer })
            .then((res) => {
              if (res.scoreboard?.version) {
                setLiveEvents((prev) =>
                  prev.map((ev) =>
                    ev.id === activeEventId ? { ...ev, version: res.scoreboard.version } : ev
                  )
                );
              }
              setActiveToast({
                id: `min-ok-${Date.now()}`,
                title: '✅ Guardado confirmado',
                body: `Minuto oficial ${safeM}' sincronizado en Firestore`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'exclusive',
                read: false,
              });
            })
            .catch((err: any) => {
              // Revertir en fallo: no confirmar guardados fallidos
              setLiveEvents(prevEvents);
              setActiveToast({
                id: `min-err-${Date.now()}`,
                title: '❌ Error al guardar minuto',
                body: err.message || 'No autorizado o error al guardar minuto',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'exclusive',
                read: false,
              });
            });
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
        onClearEvents={handleClearEvents}
        onDeleteLiveEvent={handleDeleteLiveEvent}
        events={events}
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
        openDonationModal={() => setIsDonationModalOpen(true)}
        unreadNotificationsCount={unreadCount}
        isStreamingLive={isStreamingLive}
        isVipMember={isVipMember}
        toggleVipMembership={() => setIsVipMember(!isVipMember)}
        viewerCount={presence.totalOnSite}
        activeCount={presence.activeInteracting}
        totalCount={presence.totalOnSite}
        homeScore={currentHomeScore}
        awayScore={currentAwayScore}
        matchMinute={currentMatchMinute}
        homeClub={currentHomeClub}
        awayClub={currentAwayClub}
        period={currentPeriod}
        isClockRunning={Boolean(currentLiveEvent?.isClockRunning)}
        onToggleMatchClock={() => handleToggleMatchClock()}
        matchSeconds={matchSeconds}
      />

      {/* MAIN VIEWPORT BODY */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-5 md:p-6 pb-24 md:pb-8">
        {activeTab === 'stream' && (
          <div className="space-y-4 sm:space-y-5">
            {/* Paso 12: Portada detecta los partidos en vivo (Bolívar vs The Strongest / Blooming vs Oriente) */}
            <LiveEventsShowcase
              events={liveEvents}
              activeEventId={activeEventId}
              onSelectEvent={handleSelectMatchEvent}
            />

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
                {/* Multi-Match Live Event Selector (Paso 10: partido-001, partido-002) */}
                <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap hidden sm:inline">
                    Partidos en vivo:
                  </span>
                  {liveEvents.map((evt) => {
                    const isSelected = evt.id === activeEventId;
                    const provider = evt.primaryProvider || 'cloudflare';
                    const providerEmoji = provider === 'cloudflare' ? '⚡' : (provider === 'youtube' ? '🔴' : '🟢');
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
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 font-mono text-slate-300">
                          {providerEmoji} {provider.toUpperCase()}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <UniversalStreamPlayer
                  event={currentLiveEvent}
                  isTheaterMode={isTheaterMode}
                  setIsTheaterMode={setIsTheaterMode}
                  homeScore={currentHomeScore}
                  awayScore={currentAwayScore}
                  matchMinute={currentMatchMinute}
                  viewerCount={liveViewerCount}
                  onProviderChange={(newProv) => {
                    setLiveEvents((prev) =>
                      prev.map((e) => (e.id === (currentLiveEvent?.id || activeEventId) ? { ...e, primaryProvider: newProv } : e))
                    );
                  }}
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
                      <span className="font-semibold text-white">{currentLiveEvent?.tournamentName || streamSettings?.tournamentName || 'Liga Profesional'}</span>
                      <span className="text-slate-500 hidden sm:inline">·</span>
                      <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">1080p60 HLS HD</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-xs font-mono font-bold px-2.5 py-1 rounded-md border border-slate-700 bg-slate-900/90 text-emerald-400 flex items-center gap-1.5 shadow-sm">
                        <span className={`w-2 h-2 rounded-full ${Boolean(currentLiveEvent?.isClockRunning) ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                        <span>{currentPeriod} · {currentMatchMinute}&apos;</span>
                        {Boolean(currentLiveEvent?.isClockRunning) && (
                          <span className="text-[10px] text-emerald-400/80 font-normal">
                            {String(matchSeconds).padStart(2, '0')}&quot;
                          </span>
                        )}
                      </div>
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
                    {currentLiveEvent?.title || streamSettings?.title || 'Partido en Directo'}
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

                    {/* Central Score - Marcador en tiempo real iniciado desde el dashboard */}
                    <div className="flex flex-col items-center justify-center px-3 sm:px-6 py-2 rounded-2xl bg-black/60 border border-slate-700/80 shadow-lg select-none">
                      <div className="font-mono text-2xl sm:text-4xl font-black text-emerald-400 tracking-wider tabular-nums bg-black/70 px-3 sm:px-5 py-1 rounded-xl border border-slate-700 shadow-inner flex items-center gap-1.5">
                        <span>{currentHomeScore}</span>
                        <span className="text-slate-500 font-light">-</span>
                        <span>{currentAwayScore}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300">
                          {currentPeriod} ({currentMatchMinute}&apos;{Boolean(currentLiveEvent?.isClockRunning) ? ` ${String(matchSeconds).padStart(2, '0')}"` : ''})
                        </span>
                        {Boolean(currentLiveEvent?.isClockRunning) && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 animate-pulse">
                            EN VIVO
                          </span>
                        )}
                      </div>
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
                homeScore={currentHomeScore}
                awayScore={currentAwayScore}
                matchMinute={currentMatchMinute}
                isClockRunning={Boolean(currentLiveEvent?.isClockRunning)}
                onToggleMatchClock={() => handleToggleMatchClock()}
                streamSettings={{
                  ...streamSettings,
                  title: currentLiveEvent?.title || streamSettings?.title || 'Partido en Directo',
                  homeClubId: currentLiveEvent?.homeTeam || streamSettings?.homeClubId || 'bolivar',
                  awayClubId: currentLiveEvent?.awayTeam || streamSettings?.awayClubId || 'strongest',
                  tournamentName: currentLiveEvent?.tournamentName || streamSettings?.tournamentName || 'División Profesional',
                  stadiumName: currentLiveEvent?.stadiumName || streamSettings?.stadiumName || '',
                  period: (currentLiveEvent?.period || streamSettings?.period || '1T') as any,
                }}
                events={events}
              />
            </div>
          </div>
        )}

        {/* TAB 2: DETAILED MATCH STATS */}
        {activeTab === 'stats' && (
          <MatchStats
            homeScore={currentHomeScore}
            awayScore={currentAwayScore}
            matchMinute={currentMatchMinute}
            isClockRunning={Boolean(currentLiveEvent?.isClockRunning)}
            onToggleMatchClock={() => handleToggleMatchClock()}
            streamSettings={{
              ...streamSettings,
              title: currentLiveEvent?.title || streamSettings?.title || 'Partido en Directo',
              homeClubId: currentLiveEvent?.homeTeam || streamSettings?.homeClubId || 'bolivar',
              awayClubId: currentLiveEvent?.awayTeam || streamSettings?.awayClubId || 'strongest',
              tournamentName: currentLiveEvent?.tournamentName || streamSettings?.tournamentName || 'División Profesional',
              stadiumName: currentLiveEvent?.stadiumName || streamSettings?.stadiumName || '',
              period: (currentLiveEvent?.period || streamSettings?.period || '1T') as any,
            }}
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

      {/* DONATION & SUPPORT QR MODAL */}
      <DonationQrModal
        isOpen={isDonationModalOpen}
        onClose={() => setIsDonationModalOpen(false)}
        donationQr={donationQrInfo || streamSettings.donationQr}
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
