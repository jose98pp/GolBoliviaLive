export interface MatchAudienceStats {
  activeNow: number;
  uniqueVisitors: number;
  peakViewers: number;
  hlsPlays: number;
  updatedAt: number;
}
export interface MatchAudiencePing {
  visitorId: string;
  sessionId: string;
  playbackId?: string;
  action: 'heartbeat' | 'leave';
}
export const AUDIENCE_LEASE_MS = 70000;
