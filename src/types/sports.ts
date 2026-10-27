export type EventSport = 'basketball' | 'mma' | 'other';
export type EventState = 'pre' | 'live' | 'break' | 'final' | 'postponed' | 'cancelled';
export interface EventParticipant {
  name: string;
  imageUrl?: string;
  score?: number;
  winner?: boolean;
}
export interface SportsEvent {
  scheduledAt?: string | null;
  sport: EventSport;
  competition: string;
  competitionLogo?: string;
  participants: [EventParticipant, EventParticipant];
  state: EventState;
  phase?: string;
  clock?: string;
  result?: string;
  source?: { competition: string; eventId: string; boutId?: string; date?: string; enabled: boolean };
  syncedAt?: number;
}
