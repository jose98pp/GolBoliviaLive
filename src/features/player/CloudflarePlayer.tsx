import React, { useState, useRef, useEffect } from 'react';
import { LiveEvent } from '../../types/football';
import { AlertCircle, RefreshCw, Zap, Shield, ExternalLink, Settings, Play, Volume2, VolumeX } from 'lucide-react';
import Hls from 'hls.js';

export interface CloudflarePlayerProps {
  event: LiveEvent;
  onFailover?: () => void;
  isTheaterMode?: boolean;
  onToggleTheater?: () => void;
}

export const CloudflarePlayer: React.FC<CloudflarePlayerProps> = ({
  event,
  onFailover,
  isTheaterMode,
  onToggleTheater,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackMode, setPlaybackMode] = useState<'hls' | 'stream_iframe'>(() => {
    // If liveInputId is available and no playbackUrl, use stream_iframe. Otherwise prefer hls.
    if (event.cloudflare?.playbackUrl) return 'hls';
    if (event.cloudflare?.liveInputId) return 'stream_iframe';
    return 'hls';
  });

  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [failoverCountdown, setFailoverCountdown] = useState<number | null>(null);

  const playbackUrl = event.cloudflare?.playbackUrl || '';
  const liveInputId = event.cloudflare?.liveInputId || '';

  // Auto failover timer (Paso 14: Cloudflare -> failover automático -> YouTube)
  useEffect(() => {
    if (hasError && onFailover) {
      setFailoverCountdown(3);
      const timer = setInterval(() => {
        setFailoverCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            onFailover();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setFailoverCountdown(null);
    }
  }, [hasError, onFailover]);

  // HLS playback setup for native or Cloudflare HLS streams
  useEffect(() => {
    if (playbackMode !== 'hls' || !playbackUrl || !videoRef.current) return;

    const video = videoRef.current;
    let hls: Hls | null = null;
    let retryAttempts = 0;
    setHasError(false);
    setErrorMessage(null);

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
      });

      hls.loadSource(playbackUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
        setHasError(false);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              retryAttempts += 1;
              if (retryAttempts <= 2) {
                setErrorMessage(`Error de red con Cloudflare. Reintentando (${retryAttempts}/2)...`);
                hls?.startLoad();
              } else {
                setHasError(true);
                setErrorMessage('Señal Cloudflare no disponible. Activando failover a YouTube...');
                hls?.destroy();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setErrorMessage('Error decodificando flujo HLS. Recuperando...');
              hls?.recoverMediaError();
              break;
            default:
              setHasError(true);
              setErrorMessage('Señal Cloudflare interrumpida.');
              hls?.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = playbackUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
        setHasError(false);
      });
      video.addEventListener('error', () => {
        setHasError(true);
        setErrorMessage('Error al reproducir señal HLS.');
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [playbackUrl, playbackMode]);

  const handleRetry = () => {
    setHasError(false);
    setErrorMessage(null);
    setFailoverCountdown(null);
    if (videoRef.current) {
      try {
        videoRef.current.load();
        videoRef.current.play().catch(() => {});
      } catch {}
    }
  };

  const iframeSrc = liveInputId
    ? `https://iframe.videodelivery.net/${encodeURIComponent(liveInputId)}?autoplay=true&muted=true&preload=auto`
    : '';

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-sky-900/40 group select-none">
      {/* Cloudflare Stream Info Bar */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-sky-500/30 text-xs text-sky-200 pointer-events-auto">
          <Zap className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
          <span className="font-bold tracking-wide text-white">Cloudflare Stream</span>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <span className="text-[11px] text-sky-300 font-mono hidden sm:inline">
            {liveInputId ? `Input: ${liveInputId.substring(0, 8)}...` : 'HLS Direct'}
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping ml-1" />
        </div>

        {/* Mode switch if both liveInputId and playbackUrl exist */}
        {liveInputId && playbackUrl && (
          <div className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-700 pointer-events-auto text-[11px]">
            <button
              onClick={() => setPlaybackMode('hls')}
              className={`px-2 py-0.5 rounded-full font-medium transition-colors ${
                playbackMode === 'hls' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              HLS Player
            </button>
            <button
              onClick={() => setPlaybackMode('stream_iframe')}
              className={`px-2 py-0.5 rounded-full font-medium transition-colors ${
                playbackMode === 'stream_iframe' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Stream Iframe
            </button>
          </div>
        )}
      </div>

      {/* Main Video View */}
      {playbackMode === 'stream_iframe' && iframeSrc ? (
        <iframe
          src={iframeSrc}
          className="w-full h-full border-0 absolute inset-0"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          title={`${event.title} - Cloudflare Stream`}
        />
      ) : (
        <div className="w-full h-full relative">
          <video
            ref={videoRef}
            className="w-full h-full object-contain bg-black"
            playsInline
            autoPlay
            muted={isMuted}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onClick={() => {
              if (videoRef.current) {
                if (videoRef.current.paused) {
                  videoRef.current.play();
                  setIsPlaying(true);
                } else {
                  videoRef.current.pause();
                  setIsPlaying(false);
                }
              }
            }}
          />

          {/* Buffering Indicator */}
          {isBuffering && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
              <div className="flex items-center gap-2 bg-slate-900/90 text-sky-400 px-4 py-2 rounded-xl text-xs font-semibold animate-pulse border border-sky-500/30">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Buffering Cloudflare...</span>
              </div>
            </div>
          )}

          {/* Quick Audio Mute / Unmute Overlay */}
          <div className="absolute bottom-3 right-3 z-20">
            <button
              onClick={() => {
                if (videoRef.current) {
                  const nextMuted = !isMuted;
                  videoRef.current.muted = nextMuted;
                  setIsMuted(nextMuted);
                }
              }}
              className="p-2 rounded-full bg-slate-950/80 hover:bg-slate-900 text-white border border-slate-700 transition cursor-pointer"
              title={isMuted ? 'Activar sonido' : 'Silenciar'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>
      )}

      {/* Error or Failover Fallback Banner */}
      {hasError && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
          <AlertCircle className="w-12 h-12 text-amber-400 mb-3 animate-bounce" />
          <h3 className="text-base sm:text-lg font-bold text-white mb-1">
            Señal de Cloudflare temporalmente no disponible
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-4">
            {errorMessage || 'No se pudo conectar con el Live Input ID o la URL de Cloudflare Stream.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleRetry}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reintentar Cloudflare
            </button>
            {onFailover && (
              <button
                onClick={onFailover}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-lg shadow-amber-950/50"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>
                  {failoverCountdown !== null
                    ? `Cambiando a ${(event.fallbackOrder?.[1] || 'YouTube').toUpperCase()} en ${failoverCountdown}s (Clic para cambiar ahora)`
                    : `Activar Proveedor Alternativo (${(event.fallbackOrder?.[1] || 'YouTube').toUpperCase()})`}
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
