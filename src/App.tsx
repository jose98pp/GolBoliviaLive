import { useEspnLiveEvents } from './hooks/useEspnLiveEvents';
import { useMatchAudience } from './hooks/useMatchAudience';
import { ClubCrest } from './components/ClubCrest';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
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
import { BOLIVIAN_CLUBS, EMPTY_POLL } from './data/bolivianFootballData';
import { MessageSquare, Tv, Activity, ShieldCheck, Video, Flame, MapPin, RefreshCw, Radio } from 'lucide-react';
import { DonationQrModal } from './components/DonationQrModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { SocialFollowBanner } from './components/SocialFollowBanner';
import { LiveAudienceModal } from './components/LiveAudienceModal';
import { useRealPresence } from './hooks/useRealPresence';
import { useClubs } from './hooks/useClubs';
import { apiClient } from './services/apiClient';
import { authService } from './services/auth';
import { getMatchSlug, findEventBySlug } from './utils/slug';
import {
  getMatchStatusInfo,
  filterMatchesByCategory,
  getMatchCategoryCounts,
  MatchFilterCategory,
} from './utils/matchStatus';
import { LiveEventsShowcase } from './components/LiveEventsShowcase';
import { IptvChannelsView } from './components/IptvChannelsView';
import type { IptvChannel } from './types/iptv';
import { iptvService } from './services/iptvService';
import {
  subscribeScoreboardFirebase,
  subscribeMatchEventsFirebase,
  subscribeStreamSettingsFirebase,
  getStreamSettingsFromFirebase,
  subscribeDonationQrFirebase,
  getDonationQrFromFirebase,
  clearMatchEventsInFirebase,
  clearChatInFirebase,
} from './services/firebase';

const SecretLoginPage = lazy(() => import('./components/SecretLoginPage').then((module) => ({ default: module.SecretLoginPage })));

// ── Stream config sync (debounced) ──
const STREAM_SYNC_DEBOUNCE_MS = 800;
const pendingStreamSync = new Map<string, Partial<StreamSettings>>();
const streamSyncTimers = new Map<string, ReturnType<typeof setTimeout>>();

// Limpia la copia local antigua de partidos (ya no se usa): evita datos viejos o eliminados.
try { localStorage.removeItem('golbolivia_live_events'); } catch {}

export default function App() {
  const { clubs } = useClubs();
  const [activeTab, setActiveTab] = useState<'stream' | 'exclusive' | 'iptv'>(() => window.location.pathname.startsWith('/tv') ? 'iptv' : 'stream');
  const [activeIptvChannel, setActiveIptvChannel] = useState<IptvChannel | null>(null);
  const [mobileViewMode, setMobileViewMode] = useState<'stream' | 'chat'>('stream');
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [isAudienceModalOpen, setIsAudienceModalOpen] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const saved = localStorage.getItem('golbolivia_chat_visible');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [signalReloadKey, setSignalReloadKey] = useState<number>(0);
  const [isReloadingSignal, setIsReloadingSignal] = useState<boolean>(false);

  // Helper de resiliencia para proveedores de eventos
  const getSafeEventProvider = (evt: any): string => {
    const provider = evt.primaryProvider || 'cloudflare';
    return provider.toUpperCase();
  };

  const handleToggleChat = () => {
    // Permite alternar entre Abrir Chat y Ocultar Chat
    setIsChatVisible((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('golbolivia_chat_visible', String(next));
      } catch {}
      return next;
    });
  };

  const handleReloadCurrentSignal = () => {
    setIsReloadingSignal(true);
    setSignalReloadKey((k) => k + 1);
    setTimeout(() => {
      setIsReloadingSignal(false);
    }, 600);
  };

  const iptvPlayerRef = useRef<HTMLDivElement | null>(null);
  const [iptvScrollRequest, setIptvScrollRequest] = useState(0);

  // Las rutas /tv/:id son independientes de los partidos y sus tres señales.
  useEffect(() => {
    const resolveTvRoute = async () => {
      const path = window.location.pathname;
      if (!path.startsWith('/tv')) return;
      setActiveTab('iptv');
      const segments = path.split('/');
      const channelId = segments.length === 3 && segments[1] === 'tv' ? segments[2] : undefined;
      if (!channelId) { setActiveIptvChannel(null); return; }
      try {
        const channels = await iptvService.getChannels();
        const channel = channels.find((c) => c.id === decodeURIComponent(channelId));
        setActiveIptvChannel(channel || null);
        if (channel) setIptvScrollRequest((n) => n + 1);
      } catch { setActiveIptvChannel(null); }
    };
    void resolveTvRoute();
    window.addEventListener('popstate', resolveTvRoute);
    return () => window.removeEventListener('popstate', resolveTvRoute);
  }, []);

  useEffect(() => {
    if (activeTab !== 'iptv' || !activeIptvChannel || !iptvScrollRequest) return;
    const frame = requestAnimationFrame(() => iptvPlayerRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    }));
    return () => cancelAnimationFrame(frame);
  }, [activeTab, activeIptvChannel, iptvScrollRequest]);

  const handleSelectIptvChannel = (channel: IptvChannel) => {
    setActiveIptvChannel(channel);
    setActiveTab('iptv');
    window.history.pushState(null, '', `/tv/${encodeURIComponent(channel.id)}`);
    iptvService.saveLastPlayed(channel);
    setIptvScrollRequest((n) => n + 1);
    setSignalReloadKey((k) => k + 1);
  };

  const handleReturnToMatchBroadcast = () => {
    setActiveIptvChannel(null);
    window.history.pushState(null, '', '/');
    setActiveTab('stream');
    setSignalReloadKey((k) => k + 1);
  };

  // Real-time live connected presence exclusively on this web & app
  const presence = useRealPresence(true);


  // Secret /login & /admin route detection with session persistence across page reload
  const [isLoginRoute, setIsLoginRoute] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const isUrlAdmin = path === '/login' || path.startsWith('/login') || hash === '#/login' ||
                       path === '/admin' || path.startsWith('/admin') || hash === '#/admin';
    let isPersistedAdmin = false;
    try {
      isPersistedAdmin = Boolean(
        sessionStorage.getItem('golbolivia_admin_view') === '1' && authService.getToken()
      );
    } catch {}
    return isUrlAdmin || isPersistedAdmin;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
    const handleLocationChange = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const isUrlAdmin = path === '/login' || path.startsWith('/login') || hash === '#/login' ||
                         path === '/admin' || path.startsWith('/admin') || hash === '#/admin';
      let isPersistedAdmin = false;
      try {
        isPersistedAdmin = Boolean(
          sessionStorage.getItem('golbolivia_admin_view') === '1' && authService.getToken()
        );
      } catch {}
      setIsLoginRoute(isUrlAdmin || isPersistedAdmin);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  useEffect(() => {
    if (isLoginRoute) {
      try {
        sessionStorage.setItem('golbolivia_admin_view', '1');
      } catch {}
      if (typeof window !== 'undefined' && window.history) {
        const path = window.location.pathname.toLowerCase();
        const hash = window.location.hash.toLowerCase();
        if (!path.startsWith('/login') && !path.startsWith('/admin') && hash !== '#/login' && hash !== '#/admin') {
          try {
            window.history.replaceState(null, '', '/login');
          } catch {}
        }
      }
    }
  }, [isLoginRoute]);

  const handleReturnToPublic = () => {
    try {
      sessionStorage.removeItem('golbolivia_admin_view');
      sessionStorage.removeItem('golbolivia_admin_tab');
    } catch {}
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

function sanitizeClientEvent(e: any, idx = 0): LiveEvent {
  const docId = e?.id || `partido-00${idx + 1}`;
  const home = (typeof e?.homeTeam === 'string' && e.homeTeam.trim()) || '';
  const away = (typeof e?.awayTeam === 'string' && e.awayTeam.trim()) || '';
  const title = (typeof e?.title === 'string' && e.title.trim()) || (home && away ? `${home} vs ${away}` : `Partido ${idx + 1}`);

  return {
    ...e,
    id: docId,
    title,
    homeTeam: home,
    awayTeam: away,
    isLive: e?.isLive !== undefined ? Boolean(e.isLive) : true,
    primaryProvider: e?.primaryProvider || 'cloudflare',
    fallbackOrder: Array.isArray(e?.fallbackOrder) && e.fallbackOrder.length > 0 ? e.fallbackOrder : ['cloudflare', 'youtube', 'kick'],
  };
}

  // Multi-Provider Live Events (Cloudflare, YouTube, Kick)
  // Los partidos vienen SOLO del servidor/Firebase (fuente única). No se leen ni se guardan copias locales.
  const [storedLiveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const liveEvents = useEspnLiveEvents(storedLiveEvents);
  const [activeEventId, setActiveEventId] = useState<string>('');
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

  const currentLiveEvent = liveEvents.find((e) => e.id === activeEventId) || liveEvents[0] || null;
  const matchAudience = useMatchAudience(currentLiveEvent?.id, !isLoginRoute && activeTab === 'stream');
  const liveViewerCount = matchAudience.stats?.activeNow || 0;
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
  const currentPeriod = (currentLiveEvent?.period || streamSettings?.period || '1T') as any;

  // Filtro de Partidos (En Vivo, Hoy, Finalizados) y Estado de Partido (VAR, Medio Tiempo, Finalizado)
  const [matchFilter, setMatchFilter] = useState<MatchFilterCategory>('all');
  const matchCategoryCounts = getMatchCategoryCounts(liveEvents);
  const filteredLiveEvents = filterMatchesByCategory(liveEvents, matchFilter);
  const currentStatusInfo = getMatchStatusInfo(currentLiveEvent);

  // Authoritative Backend Synchronization: Dedicated Match-Specific Stream Sync, GET /api/live & SSE /api/events
  useEffect(() => {
    // 1. Fetch authoritative initial state from backend
    apiClient.getLiveState()
      .then((data) => {
        if (data.streamSettings) {
          setStreamSettings((prev) => {
            const incoming = data.streamSettings;
            const updated = { ...prev };
            if (incoming.title) updated.title = incoming.title;
            if (incoming.tournamentName) updated.tournamentName = incoming.tournamentName;
            if (incoming.homeClubId) updated.homeClubId = incoming.homeClubId;
            if (incoming.awayClubId) updated.awayClubId = incoming.awayClubId;
            if (incoming.stadiumName) updated.stadiumName = incoming.stadiumName;
            if (incoming.altitudeMeters) updated.altitudeMeters = incoming.altitudeMeters;
            if (incoming.customVideoUrl) updated.customVideoUrl = incoming.customVideoUrl;
            if (incoming.backupVideoUrl) updated.backupVideoUrl = incoming.backupVideoUrl;
            if (incoming.backupChannelName) updated.backupChannelName = incoming.backupChannelName;
            if (incoming.activeStreamSource) updated.activeStreamSource = incoming.activeStreamSource;
            if (incoming.period) updated.period = incoming.period;
            if (incoming.isLive !== undefined) updated.isLive = incoming.isLive;
            if (incoming.broadcastMode) updated.broadcastMode = incoming.broadcastMode;
            if (incoming.chatMode) updated.chatMode = incoming.chatMode;
            if (incoming.officialAnnouncement !== undefined) updated.officialAnnouncement = incoming.officialAnnouncement;
            try {
              localStorage.setItem('golbolivia_stream_settings', JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }
        if (Array.isArray(data.events)) {
          setEvents(data.events);
          try {
            localStorage.setItem('golbolivia_match_events', JSON.stringify(data.events));
          } catch {}
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
      const sanitizedIncoming = incomingList.map((e, idx) => sanitizeClientEvent(e, idx));
      const result = [...prevList];
      for (const inc of sanitizedIncoming) {
        const idx = result.findIndex((e) => e.id === inc.id);
        if (idx >= 0) {
          const current = result[idx];
          const curVer = typeof current.version === 'number' ? current.version : 0;
          const incVer = typeof inc.version === 'number' ? inc.version : 0;
          const curUp = current.updatedAt || 0;
          const incUp = inc.updatedAt || 0;
          // Regla 3 & Problema 5: Rechazar datos antiguos por versión o fecha
          if (incVer > curVer) {
            result[idx] = sanitizeClientEvent({ ...current, ...inc }, idx);
          } else if (incVer === curVer && incUp >= curUp) {
            result[idx] = sanitizeClientEvent({ ...current, ...inc }, idx);
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
        // Firestore es la fuente autoritativa de partidos. El snapshot SSE puede venir de otra instancia serverless desactualizada.
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
      } else if (type === 'LIVE_EVENT_DELETED' || type === 'LIVE_EVENTS_UPDATED') {
        // No aplicar snapshots de instancias serverless al listado de Firestore.
        // Las eliminaciones confirmadas y las altas llegan por subscribeMultiLiveEvents.
      } else if (type === 'MATCH_EVENT_ADDED') {
        setEvents((prev) => [data, ...prev]);
      } else if (type === 'MATCH_EVENT_UPDATED') {
        setEvents((prev) => prev.map((e) => (e.id === data.id ? { ...e, ...data } : e)));
      } else if (type === 'MATCH_EVENT_DELETED') {
        setEvents((prev) => prev.filter((e) => e.id !== data.id));
      } else if (type === 'MATCH_EVENTS_CLEARED') {
        setEvents([]);
        try {
          localStorage.removeItem('golbolivia_match_events');
        } catch {}
      } else if (type === 'CHAT_CLEARED') {
        try {
          localStorage.removeItem('golbolivia_real_chat_messages');
        } catch {}
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          try {
            const bc = new BroadcastChannel('gol_bolivia_live_chat_channel');
            bc.postMessage({ type: 'CLEAR_CHAT' });
            bc.close();
          } catch {}
        }
      }
    });

    // 4. Real-time Firebase Firestore Push Listeners: Listen to liveEvents and events collections (Fuente única de datos reales)
    const unsubscribeMatchEvents = subscribeMatchEventsFirebase((fbEvents) => {
      if (Array.isArray(fbEvents)) {
        setEvents(fbEvents);
        try {
          localStorage.setItem('golbolivia_match_events', JSON.stringify(fbEvents));
        } catch {}
      }
    });

    const unsubscribeMultiLiveEvents = apiClient.subscribeMultiLiveEvents((fbEvents) => {
      if (Array.isArray(fbEvents)) {
        // Snapshot autoritativo de Firestore: las altas y bajas se reflejan juntas.
        // No mezclar con SSE ni conservar elementos que ya fueron eliminados.
        setLiveEvents(fbEvents.map((e, idx) => sanitizeClientEvent(e, idx)));
      }
    });

    // No hacer una carga inicial adicional del backend: su respuesta puede llegar
    // después del snapshot de Firestore y reemplazar una lista más reciente.

    // 5. Heartbeat to report real active viewer session to server
    const heartbeatTimer = setInterval(() => {
      if (sessionIdRef.current) {
        apiClient.sendHeartbeat(sessionIdRef.current);
      }
    }, 15000);

    return () => {
      unsubscribeStream();
      unsubscribeEvents();
      unsubscribeMatchEvents();
      unsubscribeMultiLiveEvents();
      unsubscribeDonationQr();
      clearInterval(heartbeatTimer);
    };
  }, []);

  // Paso 12: Route detection for /live/bolivar-the-strongest, /live/blooming-oriente, etc.
  const prevActiveEventIdRef = useRef<string>(activeEventId);
  useEffect(() => {
    const handleUrlRoute = () => {
      if (typeof window === 'undefined' || isLoginRoute) return;
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
      } else if (liveEvents.length > 0) {
        const fallback = liveEvents.find((e) => e.id === activeEventId) || liveEvents[0];
        if (fallback) {
          prevActiveEventIdRef.current = fallback.id;
          setActiveEventId(fallback.id);
          if (path.includes('/live/')) {
            try {
              window.history.replaceState(null, '', `/live/${getMatchSlug(fallback)}`);
            } catch {}
          }
        }
      }
    };

    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    return () => window.removeEventListener('popstate', handleUrlRoute);
  }, [liveEvents, isLoginRoute]);

  const handleSelectMatchEvent = (evt: LiveEvent) => {
    setActiveIptvChannel(null);
    setActiveTab('stream');
    setActiveEventId(evt.id);
    const slug = getMatchSlug(evt);
    if (!isLoginRoute && typeof window !== 'undefined' && window.history) {
      try {
        window.history.pushState(null, '', `/live/${slug}`);
      } catch {}
    }
    // La selección del espectador no muta la configuración global ni la de otro partido.
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

  const [activePoll, setActivePoll] = useState<LivePoll>(EMPTY_POLL);

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

  // El marcador y minuto en la portada son autoritativos y se sincronizan en tiempo real
  // exclusivamente desde la consola del dashboard vía SSE y Firestore. No se ejecuta reloj cliente artificial.

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
    if (newSettings.donationQr) {
      setDonationQrInfo(newSettings.donationQr);
    }
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
      return updated;
    });

    // Debounced so text inputs (YouTube ID, Kick channel) send one request instead of one per keystroke.
    if (!activeEventId) return;
    pendingStreamSync.set(activeEventId, { ...pendingStreamSync.get(activeEventId), ...newSettings });
    clearTimeout(streamSyncTimers.get(activeEventId));
    const targetEventId = activeEventId;
    streamSyncTimers.set(targetEventId, setTimeout(() => {
      const patch = pendingStreamSync.get(targetEventId) || {};
      pendingStreamSync.delete(targetEventId);
      streamSyncTimers.delete(targetEventId);
      apiClient.syncStreamConfig({ ...patch, activeEventId: targetEventId, eventId: targetEventId }).then(result => {
        if (result.event) setLiveEvents(events => events.map(event => event.id === result.event!.id && (event.version || 0) <= (result.event!.version || 0) ? result.event! : event));
      }).catch((err) => {
        console.error('Error al sincronizar señal del partido:', err);
      });
    }, STREAM_SYNC_DEBOUNCE_MS));
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
    clearMatchEventsInFirebase().catch(() => {});
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
    clearChatInFirebase().catch(() => {});
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
      console.error('[App] No se confirmó la eliminación en Firestore:', err.message || err);
      throw err; // Propagar el fallo al editor y no modificar la UI.
    }

    const remaining = liveEvents.filter((e) => e.id !== id);
    setLiveEvents(remaining);

    if (activeEventId === id || !remaining.some((e) => e.id === activeEventId)) {
      if (remaining.length > 0) {
        const next = remaining[0];
        setActiveEventId(next.id);
        const slug = getMatchSlug(next);
        if (!isLoginRoute && typeof window !== 'undefined' && window.history) {
          try {
            window.history.replaceState(null, '', `/live/${slug}`);
          } catch {}
        }
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
      } else {
        setActiveEventId('');
        if (!isLoginRoute && typeof window !== 'undefined' && window.history) {
          try {
            window.history.replaceState(null, '', '/');
          } catch {}
        }
        setStreamSettings((s) => ({
          ...s,
          title: '',
          homeClubId: '',
          awayClubId: '',
          tournamentName: '',
          stadiumName: '',
          homeScore: 0,
          awayScore: 0,
        }));
      }
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
    if (!currentLiveEvent) {
      return (
        <div className="w-full h-full min-h-screen bg-[#060911] flex flex-col items-center justify-center p-6 text-center text-slate-400">
          <div className="text-lg font-semibold text-white mb-2">Sin partido activo</div>
          <div className="text-sm max-w-md">
            No hay partidos disponibles en este momento. El administrador aún no ha creado o publicado partidos en vivo.
          </div>
        </div>
      );
    }
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
      <Suspense fallback={<div role="status" className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-6">Cargando panel de administración…</div>}>
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
          if (ev) {
            setStreamSettings((s) => ({
              ...s,
              title: ev.title,
              homeClubId: ev.homeTeam,
              awayClubId: ev.awayTeam,
              tournamentName: ev.tournamentName || s.tournamentName || '',
              stadiumName: ev.stadiumName || s.stadiumName || '',
              period: (ev.period as any) || s.period || '1T',
              homeScore: ev.homeScore ?? s.homeScore,
              awayScore: ev.awayScore ?? s.awayScore,
            }));
          }
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
              ev.id === (data.id || activeEventId) && (!data.version || !ev.version || data.version >= ev.version) ? { ...ev, ...data } : ev
            );
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
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] liquid-glass-background text-slate-100 flex flex-col font-sans pb-16 md:pb-0">
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
        viewerCount={liveViewerCount}
        activeCount={liveViewerCount}
        totalCount={liveViewerCount}
        homeScore={currentHomeScore}
        awayScore={currentAwayScore}
        matchMinute={currentMatchMinute}
        homeClub={currentHomeClub}
        awayClub={currentAwayClub}
        period={currentPeriod}
        matchStatusLabel={currentStatusInfo.label}
        isClockRunning={Boolean(currentLiveEvent?.isClockRunning)}
        onToggleMatchClock={() => handleToggleMatchClock()}
        matchSeconds={matchSeconds}
      />

      {/* MAIN VIEWPORT BODY */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-5 md:p-6 pb-24 md:pb-8 scroll-mt-20">
        {activeTab === 'stream' && (
          <div className="space-y-4 sm:space-y-5">
            {/* Split Grid for Stream & Chat */}
            <div
              className={`grid gap-5 ${
                isTheaterMode || !isChatVisible
                  ? 'grid-cols-1'
                  : 'grid-cols-1 lg:grid-cols-12 items-start'
              }`}
            >
              {/* VIDEO PLAYER COLUMN - ALWAYS ACTIVE & VISIBLE ON MOBILE & DESKTOP */}
              <div
                className={`${
                  isTheaterMode || !isChatVisible
                    ? 'w-full'
                    : 'lg:col-span-8'
                } w-full transition-all duration-200`}
              >
                {/* Fútbol Libre Style: Barra del Partido Activo y Opciones de Señal (Cloudflare, YouTube, Kick) */}
                {currentLiveEvent && (
                  <div className="mb-3 p-3 rounded-2xl liquid-glass-panel border border-white/10 flex flex-col gap-3 shadow-lg">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        {currentStatusInfo.isPulsing && (
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentStatusInfo.dotClass}`} />
                        )}
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${currentStatusInfo.dotClass}`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block truncate">
                            {currentStatusInfo.shortLabel} · {currentLiveEvent.tournamentName || streamSettings.tournamentName || 'Liga Profesional'}
                            {(currentLiveEvent.stadiumName || streamSettings.stadiumName) && ` · ${currentLiveEvent.stadiumName || streamSettings.stadiumName}`}
                          </span>
                          {/* Badge de estado autoritativo (Medio Tiempo, VAR, Finalizado, etc.) */}
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border shrink-0 flex items-center gap-1 shadow-sm ${currentStatusInfo.badgeClass}`}>
                            {currentStatusInfo.icon === 'var' && <span>🔍</span>}
                            {currentStatusInfo.icon === 'pause' && <span>⏸</span>}
                            {currentStatusInfo.icon === 'finish' && <span>🏁</span>}
                            {currentStatusInfo.icon === 'clock' && <span>⏰</span>}
                            {currentStatusInfo.icon === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                            <span>{currentStatusInfo.label}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm sm:text-base font-black text-white font-display min-w-0 mt-0.5">
                          <span className="truncate"><ClubCrest club={currentHomeClub} className="w-5 h-5" /> {currentHomeClub?.shortName || currentHomeClub?.name}</span>
                          <span className="font-mono tabular-nums text-emerald-400 bg-black/60 px-2 py-0.5 rounded-lg border border-slate-700 shrink-0">
                            {currentHomeScore} - {currentAwayScore}
                          </span>
                          <span className="truncate">{currentAwayClub?.shortName || currentAwayClub?.name} <ClubCrest club={currentAwayClub} className="w-5 h-5" /></span>
                          <span className="text-[11px] font-mono text-amber-400 shrink-0">
                            {currentPeriod} · {currentMatchMinute}&apos;
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Canales / Opciones de Señal estilo Fútbol Libre + Recarga y Toggle de Chat */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar shrink-0 max-w-full">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
                          Señal:
                        </span>
                        {[
                          {
                            id: 'cloudflare',
                            name: 'Opción 1 (Principal)',
                            shortName: 'Opción 1',
                            badge: 'HD',
                            emoji: '⚡',
                            isConfigured: Boolean(currentLiveEvent.cloudflare?.playbackUrl?.trim()),
                          },
                          {
                            id: 'youtube',
                            name: 'Opción 2 (Alternativa)',
                            shortName: 'Opción 2',
                            badge: 'HD',
                            emoji: '▶',
                            isConfigured: Boolean(currentLiveEvent.youtube?.videoId?.trim()),
                          },
                          {
                            id: 'kick',
                            name: 'Opción 3 (Respaldo)',
                            shortName: 'Opción 3',
                            badge: 'HD',
                            emoji: '🟢',
                            isConfigured: Boolean(currentLiveEvent.kick?.channel?.trim()),
                          },
                          { id: 'external', name: 'Reproductor externo', shortName: 'Externo', badge: '', emoji: '▶', isConfigured: Boolean(currentLiveEvent.externalSource?.url) },
                        ].map((prov) => {
                          const isCurrent = (currentLiveEvent.primaryProvider || 'cloudflare') === prov.id && !activeIptvChannel;
                          return (
                            <button
                              key={prov.id}
                              type="button"
                              onClick={() => {
                                setActiveIptvChannel(null);
                                const updated: LiveEvent = { ...currentLiveEvent, primaryProvider: prov.id as StreamProvider };
                                handleSelectMatchEvent(updated);
                              }}
                              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                                isCurrent
                                  ? 'bg-emerald-400 text-black shadow-md shadow-emerald-500/20 font-black ring-1 ring-emerald-300'
                                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                              }`}
                            >
                              <span>{prov.emoji}</span>
                              <span className="hidden md:inline">{prov.name}</span>
                              <span className="md:hidden">{prov.shortName}</span>
                              {prov.isConfigured && !isCurrent && (
                                <span className="text-[9px] px-1 py-0.2 rounded font-bold uppercase bg-slate-800 text-emerald-400 border border-slate-700">
                                  {prov.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}

                        {/* Botón de Recargar Señal rápida */}
                        <button
                          type="button"
                          onClick={handleReloadCurrentSignal}
                          disabled={isReloadingSignal}
                          className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap border border-slate-700/60 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white ${
                            isReloadingSignal ? 'opacity-70 pointer-events-none' : ''
                          }`}
                          title="Si la transmisión se congela o tiene búfer, haz clic para recargar la señal"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isReloadingSignal ? 'animate-spin' : ''}`} />
                          <span className="text-[11px] hidden sm:inline">
                            {isReloadingSignal ? 'Reconectando...' : 'Recargar Señal'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}


                {currentLiveEvent?.espnLink?.enabled && <p role="status" className="text-xs text-slate-400 px-1">ESPN · {currentLiveEvent.espnUpdatedAt ? `Última actualización: ${new Date(currentLiveEvent.espnUpdatedAt).toLocaleTimeString()}` : 'Esperando datos oficiales…'} · consulta cada 30 segundos</p>}
                {currentLiveEvent ? (
                  <UniversalStreamPlayer
                    key={`${currentLiveEvent.id}-${currentLiveEvent.primaryProvider}-${currentLiveEvent.iptvSource?.channelId || 'no-iptv'}-${signalReloadKey}`}
                    event={currentLiveEvent}
                    onHlsPlaying={matchAudience.onHlsPlaying}
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
                ) : (
                  <div className="w-full aspect-video rounded-2xl bg-gradient-to-br from-[#0b1222] via-[#090f1d] to-[#060a14] border-2 border-slate-800 flex flex-col items-center justify-center text-center p-6">
                    <div className="text-white font-semibold text-lg mb-2">Sin partido activo</div>
                    <div className="text-slate-400 text-sm max-w-md">
                      No hay partidos en vivo creados aún. Inicia sesión en el panel de administrador para crear y gestionar partidos.
                    </div>
                  </div>
                )}

                {/* Mobile View Toggle Buttons: Chat or Stats below the video player */}
                <div className="lg:hidden mt-3 p-1 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center gap-1">
                  <button
                    onClick={() => {
                      setMobileViewMode('chat');
                      setIsChatVisible(true);
                    }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      mobileViewMode === 'chat' && isChatVisible ? 'bg-slate-800 text-emerald-400 font-bold shadow-sm' : 'text-slate-400'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat en Directo</span>
                  </button>
                  <button
                    onClick={() => {
                      setMobileViewMode('stream');
                    }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      mobileViewMode === 'stream' ? 'bg-slate-800 text-emerald-400 font-bold shadow-sm' : 'text-slate-400'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Partido</span>
                  </button>
                </div>

              </div>

              {/* LIVE CHAT COLUMN */}
              {isChatVisible && (
                <div
                  className={`${
                    isTheaterMode
                      ? 'w-full h-[520px]'
                      : 'lg:col-span-4'
                  } ${mobileViewMode === 'stream' ? 'hidden lg:block lg:h-[620px]' : 'block h-[420px] sm:h-[480px] lg:h-[620px]'} transition-all duration-200`}
                >
                  <LiveChat
                    onTriggerFloatingReaction={triggerReaction}
                    isVipMember={isVipMember}
                    chatMode={streamSettings.chatMode}
                    officialAnnouncement={streamSettings.officialAnnouncement}
                    activePoll={activePoll}
                    onVotePoll={handleUpdatePoll}
                    viewerCount={liveViewerCount}
                    onToggleChat={handleToggleChat}
                    isChatVisible={isChatVisible}
                  />
                </div>
              )}
            </div>

            {/* Floating Button to Reopen Chat when collapsed on wide screen */}
            {!isChatVisible && (
              <button
                type="button"
                onClick={handleToggleChat}
                className="fixed bottom-6 right-6 z-40 bg-slate-900/95 hover:bg-slate-800 text-emerald-400 border border-emerald-500/50 px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 font-bold text-xs transition-all cursor-pointer backdrop-blur-md hover:scale-105 ring-1 ring-emerald-400/20"
                title="Abrir Chat en Directo"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Abrir Chat</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  {liveViewerCount >= 1000 ? `${(liveViewerCount / 1000).toFixed(1)}k` : liveViewerCount}
                </span>
              </button>
            )}

            {/* Minuto a minuto / Estadísticas / Alineaciones */}
            <div className="pt-2 sm:pt-4">
              <MatchStats
                espnLink={currentLiveEvent?.espnLink}
                showHeader={false}
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

            {/* Vitrina de Partidos: Filtro por categoría y reproducción directa */}
            {liveEvents.length > 0 && (
              <div className="pt-2">
                <LiveEventsShowcase
                  events={liveEvents}
                  activeEventId={activeEventId}
                  onSelectEvent={handleSelectMatchEvent}
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CANALES IPTV DEPORTIVOS */}
        {activeTab === 'iptv' && (
          <div className="space-y-6">
            {activeIptvChannel && (
              <div ref={iptvPlayerRef} className="space-y-3 scroll-mt-20">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-sm font-bold text-white">
                      {activeIptvChannel.name} — En Reproducción
                    </h3>
                    <span className="text-xs text-slate-400">({activeIptvChannel.countryName})</span>
                  </div>
                </div>

                <div className="w-full">
                  <UniversalStreamPlayer
                    key={`iptv-tab-${activeIptvChannel.id}-${signalReloadKey}`}
                    isTheaterMode={isTheaterMode}
                    setIsTheaterMode={setIsTheaterMode}
                    homeScore={0}
                    awayScore={0}
                    matchMinute={0}
                    viewerCount={liveViewerCount}
                    streamSettings={{
                      title: activeIptvChannel.name,
                      tournamentName: `${activeIptvChannel.countryName} · Señal Deportiva en Directo`,
                      homeClubId: '',
                      awayClubId: '',
                      stadiumName: 'Transmisión Internacional',
                      altitudeMeters: 0,
                      period: '2T',
                      isLive: true,
                      broadcastMode: 'obs_custom',
                      customVideoUrl: activeIptvChannel.streamUrl,
                      backupVideoUrl: '',
                      backupChannelName: '',
                      activeStreamSource: 'obs',
                      autoFailoverEnabled: false,
                      chatMode: 'all',
                      officialAnnouncement: `Sintonizando canal deportivo ${activeIptvChannel.name}`,
                      overlayScoreboardVisible: false,
                      lowLatencyMode: true,
                    }}
                  />
                </div>
              </div>
            )}

            <IptvChannelsView
              onSelectChannel={handleSelectIptvChannel}
              activeStreamUrl={activeIptvChannel?.streamUrl}
            />
          </div>
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
        matchStats={matchAudience.stats}
        matchTitle={currentLiveEvent?.title}
        matchMinute={currentMatchMinute}
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
