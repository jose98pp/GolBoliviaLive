import React, { useEffect, useState } from 'react';
import { espnFootballApi } from '../services/espnFootballApi';
import { FOOTBALL_COMPETITIONS } from '../data/footballLeagues';
import type { EspnStandingGroup } from '../utils/espnDetails';
import { ChannelLogo } from './ChannelLogo';

export function EspnStandings({ league }: { league?: string }) {
  const [record, setRecord] = useState<{ league: string; groups: EspnStandingGroup[]; updatedAt: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false; let busy = false;
    setError('');
    if (!league) return;
    const refresh = async () => {
      if (busy || document.visibilityState === 'hidden') return;
      busy = true; setLoading(true);
      try {
        const groups = await espnFootballApi.getStandings(league);
        if (!cancelled) { setRecord({ league, groups, updatedAt: Date.now() }); setError(''); }
      } catch { if (!cancelled) setError('No se pudo actualizar la clasificación. Se conservan los últimos datos disponibles de esta competición.'); }
      finally { busy = false; if (!cancelled) setLoading(false); }
    };
    void refresh(); const timer = setInterval(refresh, 60000);
    document.addEventListener('visibilitychange', refresh);
    return () => { cancelled = true; clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [league]);
  if (!league) return <p className="p-4 text-sm text-slate-400">Importa o vincula el partido con ESPN para mostrar la clasificación de su competición.</p>;
  const active = record?.league === league ? record : null;
  return <section className="space-y-3" aria-label="Clasificación ESPN">
    <h3 className="text-sm font-bold text-white">Clasificación actual · {FOOTBALL_COMPETITIONS[league] || league}</h3>
    {loading && <p role="status" className="text-xs text-slate-400">Consultando ESPN…</p>}
    {error && <p role="alert" className="text-xs text-amber-300">{error}</p>}
    {active?.updatedAt && <p className="text-xs text-slate-400">ESPN · Última actualización: {new Date(active.updatedAt).toLocaleTimeString()} · consulta cada 60 segundos</p>}
    {!loading && !error && !active?.groups.length && <p className="text-sm text-slate-400">ESPN no ofrece una tabla para esta competición o etapa. Las copas eliminatorias pueden no tener clasificación.</p>}
    {active?.groups.map((group, index) => <div key={`${group.name}-${index}`} className="space-y-2">
      <h4 className="text-xs font-semibold text-slate-300">{group.name}</h4>
      <div className="overflow-x-auto rounded-lg border border-slate-800"><table className="w-full text-left text-xs">
        <thead><tr className="bg-slate-900 text-slate-400">{['#', 'Equipo', 'PJ', 'G', 'E', 'P', 'DG', 'PTS'].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead>
        <tbody>{group.rows.map(row => <tr key={row.id} className="border-t border-slate-800 text-slate-200">
          <td className="p-2">{row.position ?? '—'}</td><td className="p-2"><span className="flex min-w-32 items-center gap-2"><ChannelLogo name={row.name} src={row.logo} className="w-8 h-8" />{row.name}</span></td>
          {[row.played, row.won, row.drawn, row.lost, row.goalDiff, row.points].map((value, i) => <td key={i} className="p-2 font-mono">{value ?? '—'}</td>)}
        </tr>)}</tbody>
      </table></div>
    </div>)}
  </section>;
}
