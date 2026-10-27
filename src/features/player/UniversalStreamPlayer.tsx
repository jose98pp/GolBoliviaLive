import { getMatchStatusInfo } from '../../utils/matchStatus';
import React, { useState } from 'react';
import { getEventSources, getDefaultSourceId } from '../../utils/eventSources';
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

  const sources = getEventSources(event);
  const [selection, setSelection] = useState({ eventId: '', sourceId: '' });
  let remembered = '';
  try { if (event?.id) remembered = sessionStorage.getItem(`golbolivia-source:${event.id}`) || ''; } catch {}
  const candidate = selection.eventId === event?.id ? selection.sourceId : remembered;
  const source = sources.find(item => item.id === candidate) || sources.find(item => item.id === getDefaultSourceId(event)) || sources[0];
  const playbackSettings: StreamSettings = { ...effectiveSettings, eventSport: event?.sports?.sport,
    customVideoUrl: source?.url || (event?.sources ? '' : effectiveSettings.customVideoUrl),
    activeStreamSource: 'obs', backupVideoUrl: '', autoFailoverEnabled: false,
    waitForBroadcast: source?.waitForBroadcast || false };

  if (event?.sources && sources.length === 0) return <div role="status" className="rounded-xl border border-slate-700 bg-slate-950 p-6 text-center text-slate-300">No hay fuentes publicadas para este evento.</div>;

  return (
    <div className="reproductor-wrapper w-full space-y-2">
      {sources.length > 0 && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 p-3" aria-label="Elegir fuente del evento"><span className="text-sm text-slate-300">Fuentes</span>{sources.map(item => <button key={item.id} type="button" aria-pressed={source?.id === item.id} className={`rounded-lg px-3 py-2 text-sm font-bold ${source?.id === item.id ? 'bg-emerald-400 text-black' : 'bg-slate-800 text-white'}`} onClick={() => { setSelection({ eventId: event?.id || '', sourceId: item.id }); try { if (event?.id) sessionStorage.setItem(`golbolivia-source:${event.id}`, item.id); } catch {} }}>{item.name}</button>)}</div>}
      <span id="titulo-canal-activo" className="hidden" aria-hidden="true" />
      <StreamPlayer
        isTheaterMode={isTheaterMode}
        setIsTheaterMode={setIsTheaterMode}
        openObsModal={() => {}}
        triggerReaction={() => {}}
        homeScore={homeScore}
        awayScore={awayScore}
        matchMinute={matchMinute}
        streamSettings={playbackSettings}
        viewerCount={viewerCount}
        onHlsPlaying={onHlsPlaying}
        matchStatusLabel={event ? getMatchStatusInfo(event).label : undefined}
      />
    </div>
  );
};
