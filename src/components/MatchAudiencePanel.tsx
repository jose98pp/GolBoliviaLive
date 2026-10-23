import React, { useEffect, useState } from 'react';
import type { LiveEvent } from '../types/football';
import type { MatchAudienceStats } from '../types/matchAudience';
import { authService } from '../services/auth';

export function MatchAudiencePanel({ event }: { event?: LiveEvent }) {
  const [data, setData] = useState<{ id: string; stats: MatchAudienceStats } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!event?.id) return;
    let cancelled = false;
    let busy = false;
    setError('');
    const load = async () => {
      if (busy) return; busy = true;
      try {
        const response = await fetch(`/api/match-audience/${encodeURIComponent(event.id)}`, { headers: { Authorization: `Bearer ${authService.getToken() || ''}` }, signal: AbortSignal.timeout(12000) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudo consultar la audiencia.');
        if (!cancelled) { setData({ id: event.id, stats: result.stats }); setError(''); }
      } catch (reason) { if (!cancelled) setError(reason instanceof Error ? reason.message : 'No se pudo consultar la audiencia.'); }
      finally { busy = false; }
    };
    void load(); const timer = setInterval(load, 20000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [event?.id]);
  const stats = !error && data?.id === event?.id ? data?.stats : null;
  const metrics: [string, keyof MatchAudienceStats][] = [['Viendo ahora', 'activeNow'], ['Visitantes únicos', 'uniqueVisitors'], ['Pico de audiencia', 'peakViewers'], ['Reproducciones HLS', 'hlsPlays']];
  return <section className="rounded-2xl border border-slate-700 bg-slate-950 p-4 space-y-3" aria-label="Audiencia del partido">
    <h3 className="font-bold text-white">Audiencia por partido{event ? ` · ${event.title}` : ''}</h3>
    {!event ? <p className="text-sm text-slate-400">Selecciona un partido para consultar su audiencia.</p> : <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{metrics.map(([label, key]) => <div key={key} className="rounded-xl border border-slate-800 bg-slate-900 p-3"><p className="text-xs text-slate-400">{label}</p><strong className="block text-2xl text-emerald-300 tabular-nums">{stats ? stats[key].toLocaleString() : '—'}</strong></div>)}</div>
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
      <p className="text-xs text-slate-400">Viendo ahora: navegadores con este partido visible durante los últimos 70 segundos. Únicos aproximados por navegador, sin sumar sus pestañas. HLS cuenta un inicio por sesión del partido; pausa, reintentos y recargas del reproductor no se suman. Los iframe no confirman reproducciones. Actualización cada 20 segundos; el historial empieza al activar esta medición.</p>
    </>}
  </section>;
}
