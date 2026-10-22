import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { normalizeExternalPlayerUrl } from '../../utils/streamUtils';

export function ExternalPlayer({ url }: { url: string }) {
  const [attempt, setAttempt] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const showControlsTemporarily = useCallback(() => {
    setIsVisible(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 3000);
  }, []);

  useEffect(() => {
    showControlsTemporarily();
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [showControlsTemporarily]);

  const source = normalizeExternalPlayerUrl(url);
  if (!source) return <p role="alert">Dirección de reproductor externo no compatible.</p>;

  return (
    <div
      onMouseMove={showControlsTemporarily}
      onMouseEnter={showControlsTemporarily}
      onTouchStart={showControlsTemporarily}
      className="relative w-full h-full min-h-0 bg-black overflow-hidden flex items-center justify-center group select-none"
    >
      <iframe
        key={`${source}-${attempt}`}
        src={source}
        title="Reproductor externo del partido"
        className="w-full h-full border-0 absolute inset-0 pointer-events-auto"
        sandbox="allow-scripts allow-same-origin allow-presentation"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
      />

      {/* Floating Modern Action Bar — Ocultamiento automático tras 3 segundos de inactividad */}
      <div
        className={`absolute top-3 left-32 sm:left-36 z-20 flex items-center gap-2 transition-all duration-500 ${
          isVisible ? 'opacity-90 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            setAttempt((value) => value + 1);
            showControlsTemporarily();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/85 hover:bg-slate-900 text-slate-200 hover:text-white border border-slate-700/80 backdrop-blur-md text-xs font-semibold shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer group"
          title="Recargar transmisión"
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-180 transition-transform duration-500" />
          <span>Recargar reproductor</span>
        </button>
      </div>
    </div>
  );
}

