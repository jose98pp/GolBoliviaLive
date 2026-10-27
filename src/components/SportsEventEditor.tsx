import React, { useEffect, useRef, useState } from 'react';
import type { SportsEvent } from '../types/sports';
import { SPORTS_COMPETITIONS, SPORTS_STATE_LABELS, type SportsImport } from '../utils/sportsEvents';
import { getSportsEvents } from '../services/sportsApi';
import { SportsScoreboard } from './SportsScoreboard';

export function SportsEventEditor({ value, onChange }: { value: SportsEvent | null; onChange: (value: SportsEvent | null, title?: string, scheduledAt?: string | null) => void }) {
  const [competition, setCompetition] = useState('nba');
  const [date, setDate] = useState('');
  const [events, setEvents] = useState<SportsImport[]>([]);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  useEffect(() => () => { sequence.current++; }, []);
  useEffect(() => {
    sequence.current++; setBusy(false); setEvents([]); setError('');
    const choice = value?.source?.competition || Object.entries(SPORTS_COMPETITIONS).find(([, entry]) => entry.sport === value?.sport)?.[0];
    if (choice) setCompetition(choice);
  }, [value?.sport]);
  const patch = (changes: Partial<SportsEvent>) => value && onChange({ ...value, ...changes });
  const query = async () => {
    const request = ++sequence.current;
    setBusy(true); setError('');
    try {
      const result = await getSportsEvents(competition, date);
      if (request !== sequence.current) return;
      setEvents(result); setSelected(result[0]?.id || '');
      if (!result.length) setError('ESPN no devolvió encuentros o peleas para esta fecha. Puedes completar el evento manualmente.');
    } catch (reason) { if (request === sequence.current) setError(reason instanceof Error ? reason.message : 'Error al consultar ESPN.'); }
    finally { if (request === sequence.current) setBusy(false); }
  };
  const inputClass = 'w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-white';
  return <section className="rounded-2xl border border-sky-800 bg-slate-950 p-4 space-y-4" aria-label="Tipo de evento y participantes">
    <h3 className="font-bold text-white">Tipo de evento y participantes</h3>
    <label className="block text-sm text-slate-300">Deporte<select className={inputClass} value={value?.sport || 'football'} onChange={e => {
      sequence.current++; setEvents([]); setBusy(false); setError('');
      if (e.target.value === 'football') onChange(null);
      else onChange({ sport: e.target.value as SportsEvent['sport'], competition: '', participants: [{ name: '' }, { name: '' }], state: 'pre' });
    }}><option value="football">Fútbol</option><option value="basketball">Básquet</option><option value="mma">MMA / UFC</option><option value="other">Otro evento</option></select></label>
    {value && <>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm text-slate-300">Competición / nombre del evento<input className={inputClass} value={value.competition} maxLength={120} onChange={e => patch({ competition: e.target.value })} /></label>
        <label className="text-sm text-slate-300">URL HTTPS del logo de competición<input className={inputClass} type="url" value={value.competitionLogo || ''} onChange={e => patch({ competitionLogo: e.target.value })} /></label>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">{value.participants.map((participant, index) => <fieldset key={index} className="rounded-xl border border-slate-700 p-3 space-y-2"><legend className="text-sm text-slate-300">{value.sport === 'mma' ? 'Peleador/a' : 'Participante'} {index + 1}</legend>
        <label className="block text-xs text-slate-300">Nombre<input className={inputClass} value={participant.name} maxLength={120} onChange={e => patch({ participants: value.participants.map((p, i) => i === index ? { ...p, name: e.target.value } : p) as SportsEvent['participants'] })} /></label>
        <label className="block text-xs text-slate-300">URL HTTPS de foto o escudo<input className={inputClass} type="url" value={participant.imageUrl || ''} onChange={e => patch({ participants: value.participants.map((p, i) => i === index ? { ...p, imageUrl: e.target.value } : p) as SportsEvent['participants'] })} /></label>
        {value.sport !== 'mma' && <label className="block text-xs text-slate-300">Puntos / resultado<input className={inputClass} type="number" min="0" max="1000" step="1" value={participant.score ?? ''} onChange={e => patch({ participants: value.participants.map((p, i) => i === index ? { ...p, score: e.target.value === '' ? undefined : Number(e.target.value) } : p) as SportsEvent['participants'] })} /></label>}
        <label className="block text-xs text-slate-300"><input type="checkbox" checked={participant.winner || false} onChange={e => patch({ participants: value.participants.map((p, i) => ({ ...p, winner: i === index ? e.target.checked : false })) as SportsEvent['participants'] })} /> Ganador/a al finalizar</label>
      </fieldset>)}</div>
      <div className="grid sm:grid-cols-3 gap-3"><label className="text-sm text-slate-300">Estado<select className={inputClass} value={value.state} onChange={e => patch({ state: e.target.value as SportsEvent['state'] })}>{Object.entries(SPORTS_STATE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="text-sm text-slate-300">{value.sport === 'mma' ? 'Round' : 'Cuarto / fase'}<input className={inputClass} value={value.phase || ''} maxLength={80} onChange={e => patch({ phase: e.target.value })} /></label>
      <label className="text-sm text-slate-300">Reloj oficial (p. ej. 03:24)<input className={inputClass} value={value.clock || ''} maxLength={40} onChange={e => patch({ clock: e.target.value })} /></label></div>
      <label className="block text-sm text-slate-300">Resultado / decisión / descripción<input className={inputClass} value={value.result || ''} maxLength={240} onChange={e => patch({ result: e.target.value })} /></label>
      {value.sport !== 'other' && <div className="rounded-xl border border-slate-700 p-3 space-y-3"><h4 className="text-white font-semibold">Importar desde ESPN</h4><div className="flex flex-wrap gap-2"><select aria-label="Competición ESPN" className={inputClass} value={competition} onChange={e => { sequence.current++; setBusy(false); setCompetition(e.target.value); setEvents([]); }}>{Object.entries(SPORTS_COMPETITIONS).filter(([, data]) => data.sport === value.sport).map(([key, data]) => <option key={key} value={key}>{data.name}</option>)}</select><input aria-label="Fecha de consulta ESPN" type="date" className={inputClass} value={date} onChange={e => { sequence.current++; setBusy(false); setDate(e.target.value); setEvents([]); }} /><button type="button" disabled={busy} onClick={query} className="rounded-lg bg-sky-600 text-white px-3 py-2 text-sm disabled:opacity-50">{busy ? 'Consultando…' : 'Consultar eventos o peleas'}</button></div>
      {events.length > 0 && <><select aria-label="Evento o pelea de ESPN" className={inputClass} value={selected} onChange={e => setSelected(e.target.value)}>{events.map(event => <option key={event.id} value={event.id}>{event.title} · {event.date} · {SPORTS_STATE_LABELS[event.data.state]}</option>)}</select><button type="button" className="rounded-lg bg-emerald-600 text-white px-3 py-2" onClick={() => { const chosen = events.find(event => event.id === selected); if (chosen) onChange(chosen.data, chosen.title, chosen.data.scheduledAt); }}>Importar al formulario</button></>}
      {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}<p className="text-xs text-slate-400">UFC: elige la pelea concreta de la cartelera. La cobertura de reloj y resultado depende de ESPN.</p></div>}
      {value.source && <label className="block text-sm text-slate-300"><input type="checkbox" checked={value.source.enabled} onChange={e => patch({ source: { ...value.source!, enabled: e.target.checked } })} /> Actualización automática ESPN. Desactiva y guarda para controlar el marcador manualmente.</label>}
      <SportsScoreboard data={value} />
      <p className="text-xs text-slate-400">Guarda el formulario principal para publicar estos cambios y conservar la señal elegida. En «Otro evento» los datos son manuales. El reloj no avanza sin datos oficiales.</p>
    </>}
  </section>;
}
