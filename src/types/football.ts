export type StreamResolution = '1080p60' | '720p60' | '480p' | '360p' | 'auto';

export interface ResolutionConfig {
  id: StreamResolution;
  label: string;
  bitrate: string;
  fps: number;
  qualityBadge: string;
}

export interface Club {
  id: string;
  name: string;
  shortName: string;
  city: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  badgeEmoji: string;
  stadium: string;
  altitudeMeters: number;
}

export interface MatchEvent {
  id: string;
  minute: number;
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'var' | 'commentary' | 'corner';
  clubId?: string;
  player?: string;
  description: string;
  scoreAfter?: string;
}

export interface MatchStats {
  possession: [number, number]; // [home, away]
  shots: [number, number];
  shotsOnTarget: [number, number];
  corners: [number, number];
  fouls: [number, number];
  yellowCards: [number, number];
  redCards: [number, number];
  offsides: [number, number];
  passes: [number, number];
  passAccuracy: [number, number];
}

export interface ChatMessage {
  id: string;
  sender: string;
  clubId: string;
  text: string;
  timestamp: string;
  isVip?: boolean;
  isModerator?: boolean;
  isOfficialRelator?: boolean;
  superChatAmount?: number; // In Bolivianos (Bs.)
  emotes?: string[];
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface LivePoll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  userVotedId?: string;
}

export interface ExclusiveContent {
  id: string;
  title: string;
  clubId: string;
  category: 'camerino' | 'entrenamiento' | 'prensa' | 'entrevista';
  duration: string;
  views: number;
  isLocked: boolean;
  tag: string;
  description: string;
}

export interface StandingTeam {
  position: number;
  clubId: string;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalDiff: number;
  points: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: 'goal' | 'stream_start' | 'lineup' | 'exclusive';
  clubId?: string;
  read: boolean;
}

export interface StreamSettings {
  title: string;
  tournamentName: string;
  homeClubId: string;
  awayClubId: string;
  stadiumName: string;
  altitudeMeters: number;
  period: '1T' | 'Descanso' | '2T' | 'Tiempo Extra' | 'Finalizado';
  isLive: boolean;
  rtmpServer: string;
  streamKey: string;
  customVideoUrl: string;
  chatMode: 'all' | 'subscribers' | 'muted';
  officialAnnouncement: string;
  broadcastMode?: 'obs_custom' | 'simulation' | 'pre_match' | 'halftime' | 'var' | 'post_match';
  overlayScoreboardVisible?: boolean;
  lowLatencyMode?: boolean;
}

