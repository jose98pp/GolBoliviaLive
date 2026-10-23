import { getMatchStatusInfo } from '../../utils/matchStatus';
import React from 'react';
import { LiveEvent, StreamProvider, StreamSettings } from '../../types/football';
import { StreamPlayer } from './StreamPlayer';
import { getStreamUrlForEvent } from '../../utils/streamUtils';

export interface UniversalStreamPlayerProps {
  event?: LiveEvent;
  isTheaterMode?: boolean;
  setIsTheaterMode?: (val: boolean | ((prev: boolean) => boolean)) => void;
  onProviderChange?: (newProvider: StreamProvider) => void;
  homeScore?: number;
  awayScore?: number;
  matchMinute?: number;
  viewerCount?: number;
  onHlsPlaying?: () => void;
  streamSettings?: StreamSettings;
}

export const UniversalStreamPlayer: React.FC<UniversalStreamPlayerProps> = ({
  event,
  isTheaterMode = false,
  setIsTheaterMode = () => {},
  homeScore = 0,
  awayScore = 0,
  matchMinute = 0,
  viewerCount = 0,
  onHlsPlaying,
  streamSettings,
}) => {
  const effectiveSettings: StreamSettings = streamSettings || {
    title: event?.title || 'Sin partido seleccionado',
    tournamentName: event?.tournamentName || '',
    homeClubId: event?.homeTeam || '',
    awayClubId: event?.awayTeam || '',
    stadiumName: event?.stadiumName || '',
    altitudeMeters: 0,
    period: event?.period || '1T',
    isLive: event?.isLive ?? true,
    broadcastMode: (event?.broadcastMode as StreamSettings['broadcastMode']) || 'obs_custom',
    customVideoUrl: getStreamUrlForEvent(event),
    backupVideoUrl: event?.backupVideoUrl || '',
    backupChannelName: event?.backupChannelName || '',
    activeStreamSource: event?.activeStreamSource || 'obs',
    autoFailoverEnabled: event?.autoFailoverEnabled ?? false,
    chatMode: 'all',
    officialAnnouncement: 'Transmisión oficial de GolBolivia Live',
    overlayScoreboardVisible: false,
    lowLatencyMode: true,
  };

  return (
    <div className="reproductor-wrapper w-full space-y-2">
      <span id="titulo-canal-activo" className="hidden" aria-hidden="true" />
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
        onHlsPlaying={onHlsPlaying}
        matchStatusLabel={event ? getMatchStatusInfo(event).label : undefined}
      />
    </div>
  );
};
