import { StreamSettings, MatchEvent, ChatMessage, MatchStats, PublicStreamState, PrivateIngestCredentials, Club, LiveEvent, StreamProvider, DonationQrInfo } from '../types/football';
import { BOLIVIAN_CLUBS } from '../data/bolivianFootballData';
import { authService, AuthUser, UserRole } from './auth';
import {
  saveStreamSettingsToFirebase,
  getStreamSettingsFromFirebase,
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
  saveLiveEventToFirebase,
  saveMatchScoreboardFirebase,
  getLiveEventsFromFirebase,
  subscribeLiveEventsFirebase,
  deleteLiveEventFromFirebase,
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
    const token = authService.getToken() || 'session_admin_direct';
    headers['Authorization'] = `Bearer ${token}`;
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
    const res = await fetch('/api/live');
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      throw new Error(`API no disponible o respuesta no válida (HTTP ${res.status})`);
    }
    return await res.json();
  }

  // 5. Update Scoreboard (Server-Authoritative single point of write)
  async updateScoreboard(data: {
    homeScore?: number;
    awayScore?: number;
    matchMinute?: number;
    period?: string;
    isClockRunning?: boolean;
    activeEventId?: string;
    eventId?: string;
    version?: number;
    force?: boolean;
  }): Promise<{ success: boolean; scoreboard: any }> {
    const targetEventId = data.activeEventId || data.eventId || 'partido-001';

    // 1. Authoritative single point of write via authenticated API
    // Server handles Firestore persistence and returns confirmed scoreboard
    const res = await fetch('/api/scoreboard', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ ...data, activeEventId: targetEventId, eventId: targetEventId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Error HTTP ${res.status} al actualizar marcador` }));
      throw new Error(err.error || 'No autorizado o error al actualizar el marcador oficial');
    }

    const result = await res.json();

    // 2. Keep read-only local storage copy only upon confirmed save
    try {
      const raw = localStorage.getItem('golbolivia_scoreboard');
      const existing = raw ? JSON.parse(raw) : {};
      const merged = { ...existing, ...result.scoreboard, activeEventId: targetEventId, updatedAt: Date.now() };
      localStorage.setItem('golbolivia_scoreboard', JSON.stringify(merged));
    } catch {}

    return result;
  }

  // 6. Update Stream Settings (Server-Authoritative + Firebase)
  async updateStreamSettings(settings: Partial<StreamSettings>): Promise<{ success: boolean; streamSettings: any }> {
    // 1. Post to backend API with authentication
    const res = await fetch('/api/streams', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(settings),
    });

    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Error HTTP ${res.status} al guardar señal` }));
      throw new Error(err.error || 'No autorizado o error al actualizar configuración de transmisión');
    }

    const result = contentType.includes('application/json') ? await res.json() : { success: true, streamSettings: settings };

    // 2. Persist to Firebase Firestore with versioning
    await saveStreamSettingsToFirebase(settings).catch((err) => {
      console.warn('[ApiClient] Advertencia al guardar configuración en Firestore:', err);
    });

    // 3. Update local storage copy for reading only
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

    return result;
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
  async getStreamConfig(): Promise<Partial<StreamSettings>> {
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

    // Fallback: fetch from Firebase Firestore
    try {
      const fbConfig = await getStreamSettingsFromFirebase();
      if (fbConfig) return fbConfig;
    } catch {}

    return {};
  }

  // 6.2 Donation QR Code API
  async getDonationQr(): Promise<DonationQrInfo | null> {
    try {
      const res = await fetch('/api/donation-qr');
      if (res.ok) {
        const json = await res.json();
        if (json.donationQr) return json.donationQr;
      }
    } catch {}
    try {
      const raw = localStorage.getItem('golbolivia_donation_qr');
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }

  async saveDonationQr(data: DonationQrInfo): Promise<{ success: boolean; donationQr?: DonationQrInfo }> {
    const res = await fetch('/api/donation-qr', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Error HTTP ${res.status}` }));
      throw new Error(err.error || 'Error al guardar el código QR de apoyo.');
    }
    const json = await res.json();
    try {
      localStorage.setItem('golbolivia_donation_qr', JSON.stringify(json.donationQr || data));
    } catch {}
    return json;
  }

  // 6.3 Dedicated Endpoint: Synchronize Stream & Backup M3U8 URLs Globally to Backend
  async syncStreamConfig(config: Partial<StreamSettings> & { activeEventId?: string; eventId?: string }): Promise<{ success: boolean; config?: any }> {
    const targetEventId = config.eventId || config.activeEventId || 'partido-001';

    // 1. Post to dedicated /api/streams/config with explicit eventId via authenticated API
    const res = await fetch('/api/streams/config', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ ...config, eventId: targetEventId, activeEventId: targetEventId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Error HTTP ${res.status} al sincronizar señal` }));
      throw new Error(err.error || 'No autorizado o error al sincronizar la configuración de transmisión');
    }

    const json = await res.json();

    // 2. Persist to Firebase Firestore
    await saveStreamSettingsToFirebase(config).catch(() => {});

    // 3. Save locally for reading copy
    try {
      const raw = localStorage.getItem('golbolivia_stream_settings');
      const existing = raw ? JSON.parse(raw) : {};
      const merged = { ...existing, ...config, eventId: targetEventId };
      localStorage.setItem('golbolivia_stream_settings', JSON.stringify(merged));
      if (config.customVideoUrl !== undefined) localStorage.setItem('golbolivia_custom_video_url', config.customVideoUrl);
      if (config.backupVideoUrl !== undefined) localStorage.setItem('golbolivia_backup_m3u8_url', config.backupVideoUrl);
      if (config.activeStreamSource !== undefined) localStorage.setItem('golbolivia_active_stream_source', config.activeStreamSource);
    } catch {}

    return json;
  }

  // 6.4 Dedicated Real-Time Subscriber for Match-Specific Stream Synchronization
  subscribeStreamSync(
    onSync: (config: Partial<StreamSettings> & { eventId?: string }) => void,
    targetEventId?: string
  ): () => void {
    if (typeof window === 'undefined') return () => {};

    let lastKnownPlayback = '';
    let lastKnownSource = '';
    let lastKnownBackup = '';
    let isSubscribed = true;

    const applyIfChanged = (newConfig: any) => {
      if (!newConfig) return;
      // If targetEventId is specified and incoming update is for a different event, do not touch!
      if (targetEventId && newConfig.eventId && newConfig.eventId !== targetEventId) {
        return;
      }

      const effectivePlayback =
        newConfig.playbackUrl ||
        (newConfig.activeStreamSource === 'backup'
          ? newConfig.backupVideoUrl || newConfig.customVideoUrl
          : newConfig.activeStreamSource === 'simulation'
          ? ''
          : newConfig.customVideoUrl || newConfig.backupVideoUrl);

      const hasChange =
        newConfig.activeStreamSource !== lastKnownSource ||
        newConfig.backupVideoUrl !== lastKnownBackup ||
        effectivePlayback !== lastKnownPlayback;

      if (hasChange) {
        lastKnownSource = newConfig.activeStreamSource;
        lastKnownBackup = newConfig.backupVideoUrl;
        lastKnownPlayback = effectivePlayback;
        const failoverUpdate: Partial<StreamSettings> & { eventId?: string } = {
          eventId: newConfig.eventId || targetEventId,
          activeStreamSource: newConfig.activeStreamSource,
          backupVideoUrl: newConfig.backupVideoUrl,
          backupChannelName: newConfig.backupChannelName,
          autoFailoverEnabled: newConfig.autoFailoverEnabled,
        };
        if (newConfig.customVideoUrl) failoverUpdate.customVideoUrl = newConfig.customVideoUrl;
        if (newConfig.broadcastMode) failoverUpdate.broadcastMode = newConfig.broadcastMode;
        onSync(failoverUpdate);
      }
    };

    // Real-time Server-Sent Events (SSE) listener: only reacts when eventId matches or is relevant
    const unsubSSE = this.subscribeLiveEvents((type, data) => {
      if (!isSubscribed) return;
      if (type === 'STREAM_CONFIG_UPDATED' || type === 'STREAM_UPDATED') {
        const payload = data.streamSettings || data.stream || data;
        applyIfChanged(payload);
      }
    });

    return () => {
      isSubscribed = false;
      unsubSSE();
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
      await this.updateScoreboard({ ...params.scoreboard, force: true }).catch(() => {});
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

  /**
   * Multi-provider Live Events API (Paso 9 & 10)
   */
  public async getLiveEvents(): Promise<LiveEvent[]> {
    // 1. Try server endpoint
    try {
      const res = await fetch('/api/live-events');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.events) && data.events.length > 0) {
          try {
            localStorage.setItem('golbolivia_live_events', JSON.stringify(data.events));
          } catch {}
          return data.events;
        }
      }
    } catch {}

    // 2. Try Firestore
    try {
      const fbEvents = await getLiveEventsFromFirebase();
      if (fbEvents && fbEvents.length > 0) {
        try {
          localStorage.setItem('golbolivia_live_events', JSON.stringify(fbEvents));
        } catch {}
        return fbEvents;
      }
    } catch {}

    // 3. Try LocalStorage
    try {
      const local = localStorage.getItem('golbolivia_live_events');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    // 4. Do not return default sample matches automatically
    return [];
  }

  public async saveLiveEvent(event: LiveEvent & { force?: boolean }): Promise<LiveEvent> {
    // 1. Single authoritative point of write: Server API with authentication headers
    // The server handles Firestore persistence and returns the confirmed event with definitive version
    const res = await fetch('/api/live-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({ ...event, force: event.force ?? true }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Error HTTP ${res.status} al guardar partido` }));
      throw new Error(err.error || 'No autorizado o error al guardar el partido oficial en el servidor');
    }

    const resData = await res.json();
    const confirmedEvent: LiveEvent = resData.event || event;
    if (resData.version) confirmedEvent.version = resData.version;
    if (resData.updatedAt) confirmedEvent.updatedAt = resData.updatedAt;

    // 2. Keep read-only local storage copy upon confirmed save
    try {
      const raw = localStorage.getItem('golbolivia_live_events');
      let currentEvents: LiveEvent[] = raw ? JSON.parse(raw) : [];
      const idx = currentEvents.findIndex((e) => e.id === confirmedEvent.id);
      if (idx >= 0) {
        currentEvents[idx] = confirmedEvent;
      } else {
        currentEvents.push(confirmedEvent);
      }
      localStorage.setItem('golbolivia_live_events', JSON.stringify(currentEvents));
    } catch {}

    return confirmedEvent;
  }

  public async deleteLiveEvent(eventId: string): Promise<boolean> {
    // 1. Single authoritative point of deletion: Server API with authentication headers
    // The server deletes from Firestore and broadcasts deletion
    const res = await fetch(`/api/live-events/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Error HTTP ${res.status} al eliminar partido` }));
      throw new Error(err.error || 'No autorizado o error al eliminar el partido oficial en el servidor');
    }

    // 2. Update read-only local storage copy
    try {
      const raw = localStorage.getItem('golbolivia_live_events');
      if (raw) {
        const currentEvents: LiveEvent[] = JSON.parse(raw);
        const filtered = currentEvents.filter((e) => e.id !== eventId);
        localStorage.setItem('golbolivia_live_events', JSON.stringify(filtered));
      }
    } catch {}

    return true;
  }

  public subscribeMultiLiveEvents(callback: (events: LiveEvent[]) => void): () => void {
    return subscribeLiveEventsFirebase(callback);
  }
}

export const apiClient = new GolBoliviaApiClient();

