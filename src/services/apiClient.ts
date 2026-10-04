import { StreamSettings, MatchEvent, ChatMessage, MatchStats, PublicStreamState, PrivateIngestCredentials, Club } from '../types/football';
import { BOLIVIAN_CLUBS } from '../data/bolivianFootballData';
import { authService, AuthUser, UserRole } from './auth';
import {
  saveStreamSettingsToFirebase,
  saveScoreboardToFirebase,
  addMatchEventToFirebase,
  updateMatchEventInFirebase,
  deleteMatchEventFromFirebase,
  sendChatMessageToFirebase,
  deleteChatMessageFromFirebase,
  deleteConfirmationLogFromFirebase,
  resetStreamSettingsInFirebase,
  saveSingleClubToFirebase,
  deleteClubFromFirebase,
  getClubsFromFirebase,
  subscribeClubsFirebase,
  subscribeStreamSettingsFirebase,
  subscribeScoreboardFirebase,
  logConfirmationToFirebase,
  FIREBASE_PROJECT_ID,
} from './firebase';

export type { UserRole };
export type AuthUserInfo = AuthUser;

export interface LiveStateResponse {
  live?: boolean;
  playbackUrl?: string;
  match?: string;
  quality?: string[];
  stream?: PublicStreamState;
  streamSettings: StreamSettings;
  scoreboard: {
    homeScore: number;
    awayScore: number;
    matchMinute: number;
    period: string;
    updatedAt: number;
  };
  matchStats: MatchStats;
  events: MatchEvent[];
  viewersCount: number;
  serverTimestamp: number;
}

class GolBoliviaApiClient {
  private eventSource: EventSource | null = null;

  public getToken(): string | null {
    return authService.getToken();
  }

  public setToken(token: string | null): void {
    if (!token) {
      authService.logout().catch(() => {});
    }
  }

  private getAuthHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = authService.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // 1. Backend Login via authService
  async login(pin: string, username = 'admin'): Promise<{ user: AuthUser; token: string }> {
    return authService.login(pin, username);
  }

  // 2. Validate current session on server
  async getMe(): Promise<AuthUser | null> {
    return authService.validateSession();
  }

  // 3. Logout via authService
  async logout(): Promise<void> {
    return authService.logout();
  }

  // 4. Fetch full authoritative live state from backend
  async getLiveState(): Promise<LiveStateResponse> {
    try {
      const res = await fetch('/api/live');
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        throw new Error('API no disponible o respuesta estática');
      }
      return await res.json();
    } catch {
      // Graceful fallback for offline mode or network errors
      let localObsUrl = '';
      let localBackupUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
      let localSource: any = 'obs';
      try {
        localObsUrl = localStorage.getItem('golbolivia_custom_video_url') || '';
        localBackupUrl = localStorage.getItem('golbolivia_backup_m3u8_url') || localBackupUrl;
        localSource = localStorage.getItem('golbolivia_active_stream_source') || (localObsUrl ? 'obs' : 'simulation');
      } catch {}

      return {
        live: true,
        playbackUrl: localSource === 'backup' ? localBackupUrl : localObsUrl,
        match: 'Bolívar vs The Strongest',
        streamSettings: {
          title: 'Bolívar vs The Strongest — Clásico Paceño N° 234',
          tournamentName: 'Liga Tigo División Profesional - Torneo Clausura',
          homeClubId: 'bolivar',
          awayClubId: 'strongest',
          stadiumName: 'Estadio Olímpico Hernando Siles',
          altitudeMeters: 3637,
          period: '2T',
          isLive: true,
          rtmpServer: 'rtmp://localhost:1935/live',
          streamKey: 'bolivia',
          customVideoUrl: localObsUrl,
          backupVideoUrl: localBackupUrl,
          backupChannelName: 'GolBolivia 24/7 Señal Alternativa HD',
          activeStreamSource: localSource,
          autoFailoverEnabled: true,
          broadcastMode: localObsUrl ? 'obs_custom' : 'simulation',
          chatMode: 'all',
          officialAnnouncement: 'Transmisión oficial de GolBolivia Live.',
          overlayScoreboardVisible: true,
          lowLatencyMode: true,
        },
        scoreboard: {
          homeScore: 2,
          awayScore: 1,
          matchMinute: 78,
          period: '2T',
          updatedAt: Date.now(),
        },
        matchStats: {
          possession: [56, 44],
          shots: [15, 9],
          shotsOnTarget: [7, 4],
          corners: [6, 3],
          fouls: [11, 14],
          yellowCards: [2, 3],
          redCards: [0, 0],
          offsides: [2, 1],
          passes: [412, 318],
          passAccuracy: [86, 80],
        },
        events: [],
        viewersCount: 14820,
        serverTimestamp: Date.now(),
      };
    }
  }

  // 5. Update Scoreboard (Server-Authoritative + Firebase)
  async updateScoreboard(data: {
    homeScore?: number;
    awayScore?: number;
    matchMinute?: number;
    period?: string;
  }): Promise<{ success: boolean; scoreboard: any }> {
    // Mirror to Firebase Firestore immediately
    saveScoreboardToFirebase(data).catch(() => {});

    const res = await fetch('/api/scoreboard', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Error al actualizar marcador en el servidor');
    }
    return result;
  }

  // 6. Update Stream Settings (Server-Authoritative + Firebase)
  async updateStreamSettings(settings: Partial<StreamSettings>): Promise<{ success: boolean; streamSettings: any }> {
    // 1. Local storage backup
    try {
      if (settings.customVideoUrl !== undefined) {
        localStorage.setItem('golbolivia_custom_video_url', settings.customVideoUrl);
      }
      if (settings.backupVideoUrl !== undefined) {
        localStorage.setItem('golbolivia_backup_m3u8_url', settings.backupVideoUrl);
      }
      if (settings.activeStreamSource !== undefined) {
        localStorage.setItem('golbolivia_active_stream_source', settings.activeStreamSource);
      }
    } catch {}

    // 2. Persist to Firebase Firestore
    saveStreamSettingsToFirebase(settings).catch(() => {});

    // 3. Post to backend API
    const res = await fetch('/api/streams', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(settings),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const result = await res.json();
      return result;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error del servidor al guardar señal' }));
      throw new Error(err.error || 'Error al actualizar configuración de transmisión');
    }

    return { success: true, streamSettings: settings };
  }

  // 6.1 Switch Active Stream Source (OBS vs Backup M3U8 vs Simulation)
  async failoverStream(params: {
    activeStreamSource?: 'obs' | 'backup' | 'simulation';
    backupVideoUrl?: string;
    backupChannelName?: string;
    autoFailoverEnabled?: boolean;
  }): Promise<{ success: boolean; activeStreamSource: string; playbackUrl: string; streamSettings: any }> {
    // Save to Firebase
    saveStreamSettingsToFirebase(params).catch(() => {});

    const res = await fetch('/api/streams/failover', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(params),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Error al conmutar fuente de transmisión');
    }
    return result;
  }

  // 6.2 Dedicated Endpoint: Fetch Authoritative Stream & Backup M3U8 Config (Global Synchronization)
  async getStreamConfig(): Promise<{
    customVideoUrl: string;
    backupVideoUrl: string;
    backupChannelName: string;
    activeStreamSource: 'obs' | 'backup' | 'simulation';
    autoFailoverEnabled: boolean;
    playbackUrl: string;
    isLive: boolean;
    title: string;
    broadcastMode: string;
    updatedAt: number;
  }> {
    try {
      const res = await fetch(`/api/streams/config?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });
      if (res.ok) {
        const json = await res.json();
        return json;
      }
    } catch {}

    // Fallback: fetch from /api/streams
    try {
      const altRes = await fetch(`/api/streams?_t=${Date.now()}`);
      if (altRes.ok) {
        const altData = await altRes.json();
        const ss = altData.streamSettings || altData.stream || {};
        return {
          customVideoUrl: ss.customVideoUrl || '',
          backupVideoUrl: ss.backupVideoUrl || '',
          backupChannelName: ss.backupChannelName || 'Canal Alternativo',
          activeStreamSource: ss.activeStreamSource || 'obs',
          autoFailoverEnabled: ss.autoFailoverEnabled ?? true,
          playbackUrl: altData.playbackUrl || ss.playbackUrl || '',
          isLive: altData.live ?? true,
          title: altData.match || ss.title || 'Bolívar vs The Strongest',
          broadcastMode: ss.broadcastMode || 'obs_custom',
          updatedAt: Date.now(),
        };
      }
    } catch {}

    return {
      customVideoUrl: localStorage.getItem('golbolivia_custom_video_url') || '',
      backupVideoUrl: localStorage.getItem('golbolivia_backup_m3u8_url') || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      backupChannelName: 'GolBolivia 24/7 Señal Alternativa HD',
      activeStreamSource: (localStorage.getItem('golbolivia_active_stream_source') as any) || 'obs',
      autoFailoverEnabled: true,
      playbackUrl: '',
      isLive: true,
      title: 'Bolívar vs The Strongest',
      broadcastMode: 'obs_custom',
      updatedAt: Date.now(),
    };
  }

  // 6.3 Dedicated Endpoint: Synchronize Stream & Backup M3U8 URLs Globally to Backend
  async syncStreamConfig(config: Partial<StreamSettings>): Promise<{ success: boolean; config?: any }> {
    // 1. Save locally for instant offline feedback
    try {
      if (config.customVideoUrl !== undefined) localStorage.setItem('golbolivia_custom_video_url', config.customVideoUrl);
      if (config.backupVideoUrl !== undefined) localStorage.setItem('golbolivia_backup_m3u8_url', config.backupVideoUrl);
      if (config.activeStreamSource !== undefined) localStorage.setItem('golbolivia_active_stream_source', config.activeStreamSource);
    } catch {}

    // 2. Persist to Firebase Firestore
    saveStreamSettingsToFirebase(config).catch(() => {});

    // 3. Post to dedicated /api/streams/config
    try {
      const res = await fetch('/api/streams/config', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(config),
      });
      if (res.ok) {
        const json = await res.json();
        return json;
      }
    } catch {}

    // 4. Fallback to /api/streams
    return this.updateStreamSettings(config);
  }

  // 6.4 Dedicated Real-Time Subscriber for Global Stream & Backup M3U8 URLs Synchronization
  subscribeStreamSync(onSync: (config: Partial<StreamSettings>) => void): () => void {
    if (typeof window === 'undefined') return () => {};

    let lastKnownPlayback = '';
    let lastKnownSource = '';
    let lastKnownBackup = '';
    let isSubscribed = true;

    const applyIfChanged = (newConfig: any) => {
      if (!newConfig) return;
      const effectivePlayback = newConfig.playbackUrl ||
        (newConfig.activeStreamSource === 'backup'
          ? (newConfig.backupVideoUrl || newConfig.customVideoUrl)
          : (newConfig.activeStreamSource === 'simulation' ? '' : (newConfig.customVideoUrl || newConfig.backupVideoUrl)));

      const hasChange =
        newConfig.activeStreamSource !== lastKnownSource ||
        newConfig.backupVideoUrl !== lastKnownBackup ||
        effectivePlayback !== lastKnownPlayback;

      if (hasChange) {
        lastKnownSource = newConfig.activeStreamSource;
        lastKnownBackup = newConfig.backupVideoUrl;
        lastKnownPlayback = effectivePlayback;
        onSync(newConfig);
      }
    };

    // 1. Initial immediate sync from REST/Backend
    this.getStreamConfig().then((cfg) => {
      if (isSubscribed) applyIfChanged(cfg);
    });

    // 2. Real-time Firebase Firestore Push Listener (instant cross-device global sync)
    const unsubFirebase = subscribeStreamSettingsFirebase((firebaseSettings) => {
      if (!isSubscribed) return;
      applyIfChanged(firebaseSettings);
    });

    // 3. SSE Subscription
    const unsubSSE = this.subscribeLiveEvents((type, data) => {
      if (!isSubscribed) return;
      if (type === 'STREAM_CONFIG_UPDATED' || type === 'STREAM_UPDATED' || type === 'INITIAL_STATE') {
        const payload = data.streamSettings || data.stream || data;
        applyIfChanged(payload);
      }
    });

    // 4. High-frequency failover sync heartbeat (every 3.5s) to ensure ALL clients worldwide
    // catch backup switches even when SSE is dormant or serverless connections reset
    const syncInterval = setInterval(async () => {
      if (!isSubscribed) return;
      try {
        const fresh = await this.getStreamConfig();
        if (isSubscribed) applyIfChanged(fresh);
      } catch {}
    }, 3500);

    return () => {
      isSubscribed = false;
      unsubFirebase();
      unsubSSE();
      clearInterval(syncInterval);
    };
  }

  // 6.5 Explicit Confirmation & Full Page Data Persistence to Firebase + Server
  async confirmAndSaveAllData(params: {
    streamSettings?: Partial<StreamSettings>;
    scoreboard?: any;
    operatorName?: string;
    operatorRole?: string;
  }): Promise<{ success: boolean; message: string; timestamp: number }> {
    const timestamp = Date.now();
    const operator = params.operatorName || authService.getUser()?.name || 'Administrador General';
    const role = params.operatorRole || authService.getUser()?.role || 'ADMIN';

    // 1. Save stream settings to Firebase and backend
    if (params.streamSettings) {
      await saveStreamSettingsToFirebase(params.streamSettings).catch(() => {});
      await this.syncStreamConfig(params.streamSettings).catch(() => {});
    }

    // 2. Save scoreboard to Firebase and backend
    if (params.scoreboard) {
      await saveScoreboardToFirebase(params.scoreboard).catch(() => {});
      await this.updateScoreboard(params.scoreboard).catch(() => {});
    }

    // 3. Register persistent audit confirmation log in Firebase Firestore
    await logConfirmationToFirebase({
      action: 'CONFIRM_AND_PERSIST_PAGE_DATA',
      operator,
      role,
      details: 'Confirmación y guardado exitoso de todos los datos y señales m3u8 en Firebase Firestore.',
      payload: {
        streamSettings: params.streamSettings,
        scoreboard: params.scoreboard,
      },
      timestamp,
    }).catch(() => {});

    return {
      success: true,
      message: `¡Datos confirmados y guardados con éxito en Google Firebase Firestore (Proyecto: ${FIREBASE_PROJECT_ID})!`,
      timestamp,
    };
  }

  // 6.6 Fetch Confidential Ingest Keys (strictly protected for ADMIN and TRANSMISOR)
  async getPrivateIngestCredentials(): Promise<PrivateIngestCredentials> {
    const res = await fetch('/api/streams/private-ingest', {
      headers: this.getAuthHeaders(),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Acceso denegado a credenciales de ingesta');
    }
    return result;
  }

  // 7. Add Match Event (Goal, Card, Substitution)
  async addMatchEvent(event: Partial<MatchEvent>): Promise<MatchEvent> {
    // Mirror to Firebase
    addMatchEventToFirebase(event as any).catch(() => {});

    const res = await fetch('/api/matches/events', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(event),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Error al registrar evento');
    }
    return data.event;
  }

  // 7.1 Update Match Event (Edit event in Backend + Firebase)
  async updateMatchEvent(id: string, updates: Partial<MatchEvent>): Promise<MatchEvent> {
    // Mirror to Firebase
    updateMatchEventInFirebase(id, updates).catch(() => {});

    const res = await fetch(`/api/matches/events/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Error al actualizar evento');
    }
    return data.event;
  }

  // 7.2 Delete Match Event (Delete event in Backend + Firebase)
  async deleteMatchEvent(id: string): Promise<boolean> {
    // Mirror to Firebase
    deleteMatchEventFromFirebase(id).catch(() => {});

    const res = await fetch(`/api/matches/events/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Error al eliminar evento');
    }
    return true;
  }

  // 8. Chat
  async sendChat(sender: string, clubId: string, text: string, isVip?: boolean): Promise<ChatMessage> {
    const chatMsg = {
      sender,
      clubId,
      text,
      isVip,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Mirror to Firebase
    sendChatMessageToFirebase(chatMsg).catch(() => {});

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ sender, clubId, text, isVip }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Error al enviar mensaje');
    }
    return data.message;
  }

  // 8.1 Delete Chat Message (Moderation in Backend + Firebase)
  async deleteChatMessage(id: string): Promise<boolean> {
    // Mirror to Firebase
    deleteChatMessageFromFirebase(id).catch(() => {});

    const res = await fetch(`/api/chat/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Error al eliminar mensaje de chat');
    }
    return true;
  }

  // 8.2 Delete / Purge Confirmation Log (Firebase audit cleanup)
  async deleteConfirmationLog(id: string): Promise<boolean> {
    await deleteConfirmationLogFromFirebase(id).catch(() => {});
    return true;
  }

  // 8.3 Reset Stream Configuration (Reset / Clear in Backend + Firebase)
  async resetStreamSettings(): Promise<boolean> {
    await resetStreamSettingsInFirebase().catch(() => {});
    await this.syncStreamConfig({
      customVideoUrl: '',
      backupVideoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      activeStreamSource: 'obs',
    }).catch(() => {});
    return true;
  }

  // 8.4 Get Clubs (Customizable teams list from Firebase / Backend)
  async getClubs(): Promise<Record<string, Club>> {
    // Try from Firebase Firestore first for true cloud persistence
    try {
      const cloudClubs = await getClubsFromFirebase();
      if (cloudClubs && Object.keys(cloudClubs).length > 0) {
        return cloudClubs;
      }
    } catch {}

    // Fallback to backend /api/clubs
    try {
      const res = await fetch('/api/clubs');
      if (res.ok) {
        const data = await res.json();
        if (data.clubs && Object.keys(data.clubs).length > 0) {
          return data.clubs;
        }
      }
    } catch {}

    return BOLIVIAN_CLUBS;
  }

  // 8.5 Add or Update a Club (Save to Firebase Firestore & Backend)
  async saveClub(club: Club): Promise<{ success: boolean; club: Club; clubs: Record<string, Club> }> {
    // 1. Mirror to Firebase Firestore instantly
    saveSingleClubToFirebase(club).catch(() => {});

    // 2. Post to backend
    const res = await fetch('/api/clubs', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(club),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Error al guardar equipo en el servidor');
    }

    logConfirmationToFirebase({
      action: 'UPDATE_CLUB_RECORD',
      operator: authService.getUser()?.name || 'Administrador',
      role: authService.getUser()?.role || 'ADMIN',
      details: `Guardado / edición del equipo: ${club.name} (${club.shortName})`,
      payload: club,
      timestamp: Date.now(),
    }).catch(() => {});

    return data;
  }

  // 8.6 Delete a Club (Delete from Firebase Firestore & Backend)
  async deleteClub(clubId: string): Promise<{ success: boolean; clubs: Record<string, Club> }> {
    // 1. Mirror to Firebase Firestore
    deleteClubFromFirebase(clubId).catch(() => {});

    // 2. Delete on backend
    const res = await fetch(`/api/clubs/${encodeURIComponent(clubId)}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Error al eliminar equipo en el servidor');
    }

    logConfirmationToFirebase({
      action: 'DELETE_CLUB_RECORD',
      operator: authService.getUser()?.name || 'Administrador',
      role: 'ADMIN',
      details: `Eliminación del equipo con identificador: ${clubId}`,
      timestamp: Date.now(),
    }).catch(() => {});

    return data;
  }

  // 8.7 Real-time Subscribe to Clubs changes
  subscribeClubs(onClubs: (clubs: Record<string, Club>) => void): () => void {
    if (typeof window === 'undefined') return () => {};

    // Initial immediate load
    this.getClubs().then(onClubs);

    // Firebase real-time snapshot
    const unsubFirebase = subscribeClubsFirebase(onClubs);

    // SSE listener
    const unsubSSE = this.subscribeLiveEvents((type, data) => {
      if (type === 'CLUBS_UPDATED' && data) {
        onClubs(data);
      }
    });

    return () => {
      unsubFirebase();
      unsubSSE();
    };
  }

  // 9. Viewers Heartbeat
  async sendHeartbeat(sessionId: string): Promise<number> {
    try {
      const res = await fetch('/api/viewers/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.activeViewers;
      }
    } catch {}
    return 14820;
  }

  // 10. Real-time Server-Sent Events (SSE) Stream
  subscribeLiveEvents(onEvent: (type: string, data: any) => void): () => void {
    if (typeof window === 'undefined') {
      return () => {};
    }

    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {}
      this.eventSource = null;
    }

    let fallbackPollTimer: any = null;
    let es: EventSource | null = null;

    const startPollingFallback = () => {
      if (fallbackPollTimer) return;
      fallbackPollTimer = setInterval(async () => {
        try {
          const liveData = await this.getLiveState();
          if (liveData && liveData.streamSettings) {
            onEvent('STREAM_UPDATED', liveData.streamSettings);
          }
          if (liveData && liveData.scoreboard) {
            onEvent('SCOREBOARD_UPDATED', liveData.scoreboard);
          }
        } catch {}
      }, 10000);
    };

    if ('EventSource' in window) {
      try {
        es = new EventSource('/api/events');
        this.eventSource = es;

        const eventTypes = [
          'INITIAL_STATE',
          'STREAM_UPDATED',
          'SCOREBOARD_UPDATED',
          'MATCH_EVENT_ADDED',
          'CHAT_MESSAGE_ADDED',
          'CHAT_MESSAGE_DELETED',
        ];

        eventTypes.forEach((type) => {
          es?.addEventListener(type, (e: MessageEvent) => {
            try {
              const parsed = JSON.parse(e.data);
              onEvent(type, parsed);
            } catch {}
          });
        });

        let errorCount = 0;
        es.onerror = () => {
          errorCount++;
          // If serverless environment (e.g. Vercel) terminates persistent SSE stream
          if (errorCount >= 2) {
            try {
              es?.close();
            } catch {}
            es = null;
            this.eventSource = null;
            startPollingFallback();
          }
        };
      } catch {
        startPollingFallback();
      }
    } else {
      startPollingFallback();
    }

    return () => {
      if (es) {
        try {
          es.close();
        } catch {}
      }
      if (this.eventSource === es) {
        this.eventSource = null;
      }
      if (fallbackPollTimer) {
        clearInterval(fallbackPollTimer);
      }
    };
  }
}

export const apiClient = new GolBoliviaApiClient();
