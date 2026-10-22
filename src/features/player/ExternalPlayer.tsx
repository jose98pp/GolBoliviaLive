import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { normalizeExternalPlayerUrl } from '../../utils/streamUtils';

export function ExternalPlayer({ url }: { url: string }) {
  const [attempt, setAttempt] = useState(0);
  const source = normalizeExternalPlayerUrl(url);
  if (!source) return <p role="alert">Dirección de reproductor externo no compatible.</p>;

  return (
    <div className="relative w-full h-full min-h-0 bg-black overflow-hidden flex items-center justify-center group select-none">
      <iframe
        key={`${source}-${attempt}`}
        src={source}
        title="Reproductor externo del partido"
        className="w-full h-full border-0 absolute inset-0 pointer-events-auto"
        sandbox="allow-scripts allow-same-origin allow-presentation"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
      />

      {/* Floating Modern Action Bar */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2 pointer-events-auto transition-opacity duration-300 opacity-80 hover:opacity-100">
        <button
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
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
