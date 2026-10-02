import { StreamSettings, MatchEvent, ChatMessage, MatchStats, PublicStreamState, PrivateIngestCredentials } from '../types/football';
import { authService, AuthUser, UserRole } from './auth';

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
    const res = await fetch('/api/live');
    if (!res.ok) {
      throw new Error('Error al conectar con la API de GolBolivia');
    }
    return res.json();
  }

  // 5. Update Scoreboard (Server-Authoritative)
  async updateScoreboard(data: {
    homeScore?: number;
    awayScore?: number;
    matchMinute?: number;
    period?: string;
  }): Promise<{ success: boolean; scoreboard: any }> {
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

  // 6. Update Stream Settings (Server-Authoritative)
  async updateStreamSettings(settings: Partial<StreamSettings>): Promise<{ success: boolean; streamSettings: any }> {
    const res = await fetch('/api/streams', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(settings),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Error al actualizar configuración de transmisión');
    }
    return result;
  }

  // 6.1 Switch Active Stream Source (OBS vs Backup M3U8 vs Simulation)
  async failoverStream(params: {
    activeStreamSource?: 'obs' | 'backup' | 'simulation';
    backupVideoUrl?: string;
    backupChannelName?: string;
    autoFailoverEnabled?: boolean;
  }): Promise<{ success: boolean; activeStreamSource: string; playbackUrl: string; streamSettings: any }> {
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

  // 6.1 Fetch Confidential Ingest Keys (strictly protected for ADMIN and TRANSMISOR)
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

  // 8. Chat
  async sendChat(sender: string, clubId: string, text: string, isVip?: boolean): Promise<ChatMessage> {
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
    if (typeof window === 'undefined' || !('EventSource' in window)) {
      return () => {};
    }

    if (this.eventSource) {
      this.eventSource.close();
    }

    const es = new EventSource('/api/events');
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
      es.addEventListener(type, (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data);
          onEvent(type, parsed);
        } catch {}
      });
    });

    es.onerror = () => {
      // Reconnect handled automatically by EventSource
    };

    return () => {
      es.close();
      if (this.eventSource === es) {
        this.eventSource = null;
      }
    };
  }
}

export const apiClient = new GolBoliviaApiClient();
