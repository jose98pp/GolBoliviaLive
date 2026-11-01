import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { normalizeExternalPlayerUrl } from '../../utils/streamUtils';

export function ExternalPlayer({ url }: { url: string }) {
  const [attempt, setAttempt] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [protectionApplied, setProtectionApplied] = useState(false);
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

  const applyPopupProtection = () => {
    // Remount the iframe with a restrictive sandbox. Popups and top-level
    // navigation remain disallowed because those permissions are not granted.
    setProtectionApplied(true);
    setAttempt((value) => value + 1);
    showControlsTemporarily();
  };

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

      {/* Controles externos al iframe: el sandbox impide popups y navegación superior. */}
      <div
        className={`absolute top-3 left-3 sm:left-32 z-20 flex flex-wrap items-center gap-2 transition-all duration-300 ${
          isVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onClick={applyPopupProtection}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/95 hover:bg-emerald-900 text-emerald-100 border border-emerald-500/70 backdrop-blur-md text-xs font-semibold shadow-2xl transition-all active:scale-95 cursor-pointer"
          title="Bloquear ventanas emergentes y volver a cargar el iframe"
          aria-label="Bloquear ventanas emergentes"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
          <span>{protectionApplied ? 'Bloqueo aplicado' : 'Bloquear ventanas emergentes'}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setAttempt((value) => value + 1);
            showControlsTemporarily();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/90 hover:bg-slate-900 text-slate-200 hover:text-white border border-slate-700/80 backdrop-blur-md text-xs font-semibold shadow-2xl transition-all active:scale-95 cursor-pointer"
          title="Recargar transmisión"
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
          <span>Recargar reproductor</span>
        </button>
      </div>
    </div>
  );
}
