import React, { useState } from 'react';
import { LiveEvent } from '../../types/football';
import { Play, AlertCircle, ExternalLink, RefreshCw, Zap } from 'lucide-react';

export interface YouTubePlayerProps {
  event: LiveEvent;
  onFailover?: () => void;
  isTheaterMode?: boolean;
  onToggleTheater?: () => void;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  event,
  onFailover,
  isTheaterMode,
  onToggleTheater,
}) => {
  const [loadError, setLoadError] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const videoId = event.youtube?.videoId || '';

  const handleReload = () => {
    setLoadError(false);
    setIframeKey((prev) => prev + 1);
  };

  // Embed URL with optimized live parameters
  const embedUrl = videoId
    ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1`
    : '';

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-red-900/40 group select-none">
      {/* Top Header Badge */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-red-500/30 text-xs text-red-200 pointer-events-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
          <span className="font-bold tracking-wide text-white">YouTube Live</span>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <span className="text-[11px] text-red-300 font-mono hidden sm:inline">
            ID: {videoId || 'Sin configurar'}
          </span>
          <span className="text-[10px] bg-red-950/70 text-red-300 border border-red-800/60 px-1.5 py-0.5 rounded font-mono">
            1080p
          </span>
        </div>

        {videoId && (
          <div className="flex items-center gap-2 pointer-events-auto">
            <a
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] font-semibold bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-white px-2.5 py-1 rounded-full border border-slate-700 transition"
              title="Abrir en YouTube oficial"
            >
              <ExternalLink className="w-3 h-3 text-red-400" />
              <span className="hidden sm:inline">Ver en YouTube</span>
            </a>
          </div>
        )}
      </div>

      {/* Embed Iframe */}
      {videoId ? (
        <iframe
          key={iframeKey}
          src={embedUrl}
          className="w-full h-full border-0 absolute inset-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          title={`${event.title} - YouTube Live Player`}
          onError={() => setLoadError(true)}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-950">
          <AlertCircle className="w-10 h-10 text-red-500 mb-2 animate-bounce" />
          <p className="text-sm font-bold text-white">No hay Video ID de YouTube configurado</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Configura el videoId del partido en el panel administrativo para ver la transmisión en directo.
          </p>
        </div>
      )}

      {/* Error / Fallback Card */}
      {loadError && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
          <AlertCircle className="w-12 h-12 text-amber-400 mb-3 animate-bounce" />
          <h3 className="text-base sm:text-lg font-bold text-white mb-1">
            Transmisión de YouTube no disponible
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-4">
            Es posible que la transmisión esté finalizada o tenga restricciones geográficas.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleReload}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-2 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Recargar YouTube
            </button>
            {onFailover && (
              <button
                onClick={onFailover}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-2 transition"
              >
                <Zap className="w-3.5 h-3.5" />
                Cambiar a Siguiente Proveedor
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
