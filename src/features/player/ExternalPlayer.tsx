import React, { useState } from 'react';
import { normalizeExternalPlayerUrl } from '../../utils/streamUtils';

export function ExternalPlayer({ url }: { url: string }) {
  const [attempt, setAttempt] = useState(0);
  const source = normalizeExternalPlayerUrl(url);
  if (!source) return <p role="alert">Dirección de reproductor externo no compatible.</p>;
  return <div className="flex flex-col w-full h-full min-h-0 bg-black">
    <iframe key={`${source}-${attempt}`} src={source} title="Reproductor externo del partido"
      className="w-full flex-1 min-h-0 border-0" sandbox="allow-scripts allow-same-origin allow-presentation"
      allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen />
    <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 bg-slate-950 p-2 text-xs text-slate-300">
      <span>Usa los controles del proveedor. Si no aparece vídeo, la señal puede estar bloqueada o no disponible.</span>
      <button type="button" onClick={() => setAttempt(value => value + 1)} className="rounded border border-slate-600 px-3 py-1 text-white">Recargar reproductor</button>
    </div>
  </div>;
}
