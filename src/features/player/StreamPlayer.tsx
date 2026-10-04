import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StreamResolution, StreamSettings } from '../../types/football';
import { BOLIVIAN_CLUBS } from '../../data/bolivianFootballData';
import { useFullscreen } from './hooks/useFullscreen';
import { useCast } from './hooks/useCast';
import { useHls } from './hooks/useHls';
import { useStreamRecovery } from './hooks/useStreamRecovery';
import { usePlayerTelemetry } from './hooks/usePlayerTelemetry';
import { VideoSurface } from './VideoSurface';
import { PlayerControls } from './PlayerControls';
import { QualitySelector } from './QualitySelector';
import { AudioSelector } from './AudioSelector';
import { CastController } from './CastController';
import { StreamStats } from './StreamStats';

export interface StreamPlayerProps {
  isTheaterMode: boolean;
  setIsTheaterMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  openObsModal: () => void;
  triggerReaction: (emoji: string) => void;
  homeScore: number;
  awayScore: number;
  matchMinute: number;
  streamSettings?: StreamSettings;
  viewerCount?: number;
}

export const StreamPlayer: React.FC<StreamPlayerProps> = ({
  isTheaterMode,
  setIsTheaterMode,
  openObsModal,
  triggerReaction,
  homeScore,
  awayScore,
  matchMinute,
  streamSettings,
  viewerCount = 14820,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(0.85);

  // Settings & popovers state
  const [currentResolution, setCurrentResolution] = useState<StreamResolution>('1080p60');
  const [latencyMode, setLatencyMode] = useState<'ultra-low' | 'standard'>('ultra-low');
  const [audioTrack, setAudioTrack] = useState<'oficial' | 'radio' | 'ambiente'>('oficial');
  const [cameraAngle, setCameraAngle] = useState<'principal' | 'arco' | 'tactica' | 'ras_piso'>('principal');

  const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);
  const [showAudioMenu, setShowAudioMenu] = useState<boolean>(false);
  const [showStatsOverlay, setShowStatsOverlay] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);

  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Custom Hooks
  const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef);

  const {
    castStatus,
    castError,
    castDevice,
    showCastModal,
    setShowCastModal,
    startCast,
    disconnectCast,
  } = useCast(streamSettings?.title || 'Transmisión Oficial GolBolivia');

  const handleReloadStream = () => {
    if (videoRef.current) {
      try {
        videoRef.current.load();
        videoRef.current.play().catch(() => {});
      } catch {}
    }
  };

  const {
    isReconnecting,
    streamError,
    triggerRecovery,
    resetRecovery,
  } = useStreamRecovery(handleReloadStream);

  const [failoverBanner, setFailoverBanner] = useState<string | null>(null);

  const effectiveSrc = streamSettings?.activeStreamSource === 'backup'
    ? (streamSettings?.backupVideoUrl || streamSettings?.customVideoUrl)
    : (streamSettings?.activeStreamSource === 'simulation' ? '' : (streamSettings?.customVideoUrl || streamSettings?.backupVideoUrl));

  const handleHlsError = useCallback((err: string) => {
    triggerRecovery(err);
  }, [triggerRecovery]);

  const handleHlsSuccess = useCallback(() => {
    resetRecovery();
  }, [resetRecovery]);

  const handleHlsFailover = useCallback((source: 'backup' | 'primary') => {
    if (source === 'backup') {
      setFailoverBanner(streamSettings?.backupChannelName ? `Señal conmutada a respaldo: ${streamSettings.backupChannelName}` : 'Señal conmutada a canal de respaldo HLS.');
      setTimeout(() => setFailoverBanner(null), 8000);
    } else {
      setFailoverBanner(null);
    }
  }, [streamSettings?.backupChannelName]);

  const { isLoaded, changeLevel, hlsInstance, isUsingBackup } = useHls({
    videoRef,
    src: effectiveSrc,
    backupSrc: streamSettings?.backupVideoUrl,
    autoFailover: streamSettings?.autoFailoverEnabled !== false,
    autoplay: isPlaying,
    onError: handleHlsError,
    onSuccess: handleHlsSuccess,
    onFailoverTriggered: handleHlsFailover,
  });

  const telemetry = usePlayerTelemetry({
    videoRef,
    hlsInstance,
    isPlaying,
    currentResolutionSetting: currentResolution,
    isLiveSignal: Boolean(streamSettings?.customVideoUrl),
  });

  // Sync volume with video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Controls auto-hide timeout
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    if (isPlaying && !showQualityMenu && !showAudioMenu && !showStatsOverlay) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const handleTogglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (video) {
      if (!video.paused) {
        video.pause();
        setIsPlaying(false);
      } else {
        video.play().catch(() => {});
        setIsPlaying(true);
      }
    } else {
      setIsPlaying((prev) => !prev);
    }
    resetControlsTimeout();
  };

  const handleToggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsMuted((prev) => !prev);
  };

  const handleChangeVolume = (val: number) => {
    setVolume(val);
    if (val > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onMouseEnter={resetControlsTimeout}
      className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 ${
        isFullscreen ? 'rounded-none border-none' : ''
      }`}
    >
      {/* Video Surface (Video Tag or Simulation Canvas) */}
      <VideoSurface
        videoRef={videoRef}
        streamSettings={streamSettings}
        isPlaying={isPlaying}
        isMuted={isMuted}
        onTogglePlay={handleTogglePlay}
        isReconnecting={isReconnecting}
        streamError={streamError}
        onReloadStream={handleReloadStream}
        homeScore={homeScore}
        awayScore={awayScore}
        matchMinute={matchMinute}
      />

      {/* Failover / Backup Channel Alert Banner */}
      {(failoverBanner || isUsingBackup || streamSettings?.activeStreamSource === 'backup') && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none px-3.5 py-1.5 rounded-full bg-amber-950/90 border border-amber-500/70 text-amber-200 text-xs font-mono font-bold flex items-center gap-2 shadow-2xl backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>{failoverBanner || `Canal de Respaldo HLS Activo (${streamSettings?.backupChannelName || 'Señal Alternativa'})`}</span>
        </div>
      )}

      {/* Popovers */}
      <QualitySelector
        isOpen={showQualityMenu}
        onClose={() => setShowQualityMenu(false)}
        currentResolution={currentResolution}
        onSelectResolution={setCurrentResolution}
        latencyMode={latencyMode}
        onToggleLatencyMode={() => setLatencyMode((m) => (m === 'ultra-low' ? 'standard' : 'ultra-low'))}
        onToggleStats={() => setShowStatsOverlay((s) => !s)}
        showStatsOverlay={showStatsOverlay}
      />

      <AudioSelector
        isOpen={showAudioMenu}
        onClose={() => setShowAudioMenu(false)}
        audioTrack={audioTrack}
        onSelectAudioTrack={setAudioTrack}
        cameraAngle={cameraAngle}
        onSelectCameraAngle={setCameraAngle}
      />

      <StreamStats
        isOpen={showStatsOverlay}
        onClose={() => setShowStatsOverlay(false)}
        telemetry={telemetry}
        isLiveSignal={Boolean(streamSettings?.customVideoUrl)}
        audioTrack={audioTrack}
      />

      {/* Player Controls Bar */}
      <PlayerControls
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        isMuted={isMuted}
        volume={volume}
        onToggleMute={handleToggleMute}
        onChangeVolume={handleChangeVolume}
        showControls={showControls}
        onControlsInteraction={resetControlsTimeout}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        isTheaterMode={isTheaterMode}
        onToggleTheaterMode={() => setIsTheaterMode((t) => !t)}
        showAudioMenu={showAudioMenu}
        onToggleAudioMenu={() => {
          setShowAudioMenu((prev) => !prev);
          setShowQualityMenu(false);
        }}
        showQualityMenu={showQualityMenu}
        onToggleQualityMenu={() => {
          setShowQualityMenu((prev) => !prev);
          setShowAudioMenu(false);
        }}
        onOpenCastModal={startCast}
        onReloadStream={handleReloadStream}
        currentResolution={currentResolution}
        triggerReaction={triggerReaction}
        viewerCount={viewerCount}
      />

      {/* Cast Modal */}
      <CastController
        isOpen={showCastModal}
        onClose={() => setShowCastModal(false)}
        castStatus={castStatus}
        castDevice={castDevice}
        castError={castError}
        onDisconnect={disconnectCast}
        streamTitle={streamSettings?.title || 'Transmisión Oficial GolBolivia'}
      />
    </div>
  );
};
