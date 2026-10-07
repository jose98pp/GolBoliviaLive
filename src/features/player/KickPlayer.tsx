import React, { useState } from 'react';
import { LiveEvent } from '../../types/football';
import { AlertCircle, ExternalLink, RefreshCw, Zap, Radio } from 'lucide-react';

export interface KickPlayerProps {
  event: LiveEvent;
  onFailover?: () => void;
  isTheaterMode?: boolean;
  onToggleTheater?: () => void;
}

export const KickPlayer: React.FC<KickPlayerProps> = ({
  event,
  onFailover,
  isTheaterMode,
  onToggleTheater,
}) => {
  const [loadError, setLoadError] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const channel = event.kick?.channel || '';

  const handleReload = () => {
    setLoadError(false);
    setIframeKey((prev) => prev + 1);
  };

  // Official Kick player embed URL (unmuted by default)
  const embedUrl = channel
    ? `https://player.kick.com/${encodeURIComponent(channel)}?autoplay=true&muted=false`
    : '';

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-emerald-900/40 group select-none">
      {/* Top Header Badge */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-500/30 text-xs text-emerald-200 pointer-events-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-[#53fc18] animate-ping" />
          <span className="font-bold tracking-wide text-white">Kick Streaming</span>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <span className="text-[11px] text-emerald-300 font-mono hidden sm:inline">
            @{channel || 'sin-canal'}
          </span>
          <span className="text-[10px] bg-emerald-950/80 text-[#53fc18] border border-emerald-800/60 px-1.5 py-0.5 rounded font-mono font-bold">
            LIVE 60FPS
          </span>
        </div>

        {channel && (
          <div className="flex items-center gap-2 pointer-events-auto">
            <a
              href={`https://kick.com/${encodeURIComponent(channel)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] font-semibold bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-white px-2.5 py-1 rounded-full border border-slate-700 transition"
              title="Abrir canal en Kick.com"
            >
              <ExternalLink className="w-3 h-3 text-[#53fc18]" />
              <span className="hidden sm:inline">Canal Kick</span>
            </a>
          </div>
        )}
      </div>

      {/* Official Kick Embedded Iframe Player */}
      {channel ? (
        <iframe
          key={iframeKey}
          src={embedUrl}
          className="w-full h-full border-0 absolute inset-0"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          title={`${event.title} - Kick Streaming Player`}
          onError={() => setLoadError(true)}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-950">
          <Radio className="w-10 h-10 text-emerald-400 mb-2 animate-pulse" />
          <p className="text-sm font-bold text-white">Canal de Kick no configurado</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Ingresa el nombre del canal de Kick (por ejemplo: &quot;golbolivia&quot;) para transmitir en vivo.
          </p>
        </div>
      )}

      {/* Error / Fallback Card */}
      {loadError && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
          <AlertCircle className="w-12 h-12 text-amber-400 mb-3 animate-bounce" />
          <h3 className="text-base sm:text-lg font-bold text-white mb-1">
            Transmisión de Kick no disponible
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-4">
            No se pudo cargar el reproductor de Kick para el canal @{channel}.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleReload}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Recargar Kick
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
