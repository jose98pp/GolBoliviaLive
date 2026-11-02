import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, ShieldCheck, ExternalLink, Info } from 'lucide-react';
import { normalizeExternalPlayerUrl } from '../../utils/streamUtils';

export function ExternalPlayer({ url }: { url: string }) {
  const [attempt, setAttempt] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [protectionApplied, setProtectionApplied] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const showControlsTemporarily = useCallback(() => {
    setIsVisible(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 4500);
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
        referrerPolicy="no-referrer"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
      />

      {/* Controles externos al iframe */}
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
        <a
          href={source}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-950/90 hover:bg-sky-900 text-sky-200 hover:text-white border border-sky-700/80 backdrop-blur-md text-xs font-semibold shadow-2xl transition-all active:scale-95 cursor-pointer"
          title="Abrir transmisión directamente en pestaña nueva si el proveedor bloquea la inserción"
        >
          <ExternalLink className="w-3.5 h-3.5 text-sky-300" />
          <span>Abrir en pestaña</span>
        </a>
        <button
          type="button"
          onClick={() => setShowHint((prev) => !prev)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 text-slate-400 hover:text-white border border-slate-800 text-xs font-medium cursor-pointer"
          title="¿Por qué no carga el iframe?"
        >
          <Info className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline text-[11px] text-amber-300/90">Ayuda</span>
        </button>
      </div>

      {/* Explicación si el proveedor externo bloquea por X-Frame-Options */}
      {showHint && isVisible && (
        <div className="absolute bottom-3 inset-x-3 sm:inset-x-12 z-20 p-3 rounded-xl bg-slate-950/95 border border-amber-500/50 backdrop-blur-md text-xs text-slate-200 shadow-2xl animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                ¿La pantalla sale gris o dice «conexión rechazada»?
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                El servidor externo de esta señal prohíbe incrustarse en otras páginas mediante cabeceras de seguridad (<code className="bg-black/50 px-1 py-0.5 rounded text-amber-200">X-Frame-Options</code> o <code className="bg-black/50 px-1 py-0.5 rounded text-amber-200">frame-ancestors</code>). Usa el botón azul <strong>«Abrir en pestaña»</strong> para ver la transmisión directamente sin bloqueos, o utiliza un enlace directo HLS (<code className="bg-black/50 px-1 py-0.5 rounded text-emerald-300">.m3u8</code>).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowHint(false)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer shrink-0"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
