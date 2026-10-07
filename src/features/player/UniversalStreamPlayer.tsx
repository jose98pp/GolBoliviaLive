import React from 'react';
import { LiveEvent, StreamProvider, StreamSettings } from '../../types/football';
import { StreamPlayer } from './StreamPlayer';

export interface UniversalStreamPlayerProps {
  event?: LiveEvent;
  isTheaterMode?: boolean;
  setIsTheaterMode?: (val: boolean | ((prev: boolean) => boolean)) => void;
  onProviderChange?: (newProvider: StreamProvider) => void;
  homeScore?: number;
  awayScore?: number;
  matchMinute?: number;
  viewerCount?: number;
  streamSettings?: StreamSettings;
}

export const UniversalStreamPlayer: React.FC<UniversalStreamPlayerProps> = ({
  event,
  isTheaterMode = false,
  setIsTheaterMode = () => {},
  homeScore = 0,
  awayScore = 0,
  matchMinute = 0,
  viewerCount = 14820,
  streamSettings,
}) => {
  const effectiveSettings: StreamSettings = streamSettings || {
    title: event?.title || 'Bolívar vs The Strongest',
    tournamentName: event?.tournamentName || 'División Profesional de Bolivia',
    homeClubId: event?.homeTeam || 'bolivar',
    awayClubId: event?.awayTeam || 'strongest',
    stadiumName: event?.stadiumName || 'Estadio Olímpico Hernando Siles',
    altitudeMeters: 3637,
    period: event?.period || '2T',
    isLive: event?.isLive ?? true,
    broadcastMode: 'obs_custom',
    customVideoUrl:
      event?.cloudflare?.playbackUrl ||
      (event?.youtube?.videoId ? `https://www.youtube.com/watch?v=${event.youtube.videoId}` : '') ||
      (event?.kick?.channel ? `https://kick.com/${event.kick.channel}` : '') ||
      '',
    backupVideoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    backupChannelName: 'GolBolivia HD',
    activeStreamSource: 'obs',
    autoFailoverEnabled: true,
    chatMode: 'all',
    officialAnnouncement: 'Transmisión oficial de GolBolivia Live',
    overlayScoreboardVisible: false,
    lowLatencyMode: true,
  };

  return (
    <StreamPlayer
      isTheaterMode={isTheaterMode}
      setIsTheaterMode={setIsTheaterMode}
      openObsModal={() => {}}
      triggerReaction={() => {}}
      homeScore={homeScore}
      awayScore={awayScore}
      matchMinute={matchMinute}
      streamSettings={effectiveSettings}
      viewerCount={viewerCount}
    />
  );
};
