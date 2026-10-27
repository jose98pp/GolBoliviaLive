import React, { useState } from 'react';
import type { EventSource } from '../types/football';
import type { IptvChannel } from '../types/iptv';
import { normalizeExternalPlayerUrl } from '../utils/streamUtils';
import { normalizeEventSources } from '../utils/eventSources';
import { probeHlsSource } from '../services/sourceProbe';
import { UniversalStreamPlayer } from '../features/player/UniversalStreamPlayer';

export function EventSourcesEditor({ sources, defaultId, channels, onChange }: { sources: EventSource[]; defaultId: string; channels: IptvChannel[]; onChange: (sources: EventSource[], defaultId: string) => void }) {
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<EventSource['type']>('hls');
  const [error, setError] = useState('');
  const [testing, setTesting] = useState('');
  const [checks, setChecks] = useState<Record<string, { url: string; ok: boolean; message: string }>>({});
  const [preview, setPreview] = useState<EventSource | null>(null);
  const input = 'w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-white';
  const update = (list: EventSource[], initial = defaultId) => onChange(list, list.some(s => s.id === initial) ? initial : list[0]?.id || '');
  const add = (source: EventSource) => {
    try { const normalized = normalizeEventSources([...sources, source]); if (normalized.slice(0, -1).some(s => s.url === normalized.at(-1)!.url && s.type === normalized.at(-1)!.type)) throw new Error('Este enlace ya está añadido como fuente.'); update(normalized); setError(''); setName(''); setUrl(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Revisa la fuente.'); }
  };
  return <section className="rounded-2xl border border-cyan-800 bg-slate-950 p-4 space-y-4" aria-label="Fuentes del evento">
    <h3 className="font-bold text-white">Fuentes del evento</h3>
    <p className="text-xs text-slate-400">Añade varios canales o enlaces, ponles un nombre y elige la fuente inicial. Cada espectador podrá cambiar de opción; no se cambia de fuente automáticamente. Guarda para publicar.</p>
    {sources.map((source, index) => <fieldset key={source.id} className="rounded-xl border border-slate-700 p-3 space-y-2"><legend className="text-xs text-cyan-300">Fuente {index + 1}</legend>
      <label className="block text-xs text-slate-300">Nombre<input className={input} value={source.name} maxLength={80} onChange={e => update(sources.map(s => s.id === source.id ? { ...s, name: e.target.value } : s))} /></label>
      <label className="block text-xs text-slate-300">Tipo<select className={input} value={source.type} onChange={e => update(sources.map(s => s.id === source.id ? { ...s, type: e.target.value as EventSource['type'] } : s))}><option value="hls">HLS / M3U8</option><option value="iframe">Iframe</option><option value="youtube">YouTube</option><option value="kick">Kick</option></select></label>
      <label className="block text-xs text-slate-300">Enlace<input className={input} value={source.url} onChange={e => update(sources.map(s => s.id === source.id ? { ...s, url: e.target.value } : s))} /></label>
      {source.type === 'hls' && <label className="block text-xs text-slate-300"><input type="checkbox" checked={source.waitForBroadcast || false} onChange={e => update(sources.map(s => s.id === source.id ? { ...s, waitForBroadcast: e.target.checked } : s))} /> Mi transmisión OBS / MediaMTX: esperar el arranque HLS hasta 30 segundos</label>}
      <div className="flex flex-wrap gap-3 items-center text-xs text-slate-300"><label><input type="radio" name="event-default-source" checked={defaultId === source.id} onChange={() => update(sources, source.id)} /> Fuente inicial</label>
      <button type="button" disabled={index === 0} className="disabled:opacity-30" onClick={() => { const list = [...sources]; [list[index - 1], list[index]] = [list[index], list[index - 1]]; update(list); }}>Subir</button>
      <button type="button" className="text-red-300" onClick={() => update(sources.filter(s => s.id !== source.id))}>Quitar fuente</button>
      {source.type === 'hls' ? <button type="button" disabled={Boolean(testing)} className="text-cyan-300 disabled:opacity-50" onClick={async () => { setTesting(source.id); try { const result = await probeHlsSource(source); setChecks(current => ({ ...current, [source.id]: { ...result, url: source.url } })); } finally { setTesting(''); } }}>{testing === source.id ? 'Esperando manifiesto…' : 'Comprobar HLS'}</button> : <button type="button" className="text-cyan-300" onClick={() => { try { const selected = normalizeEventSources([source])[0]; setPreview(preview?.id === selected.id && preview.url === selected.url ? null : selected); setError(''); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Revisa el enlace.'); } }}>Probar reproductor</button>}
      </div>
      {checks[source.id]?.url === source.url && <p role="status" className={`text-xs ${checks[source.id].ok ? 'text-emerald-300' : 'text-amber-300'}`}>{checks[source.id].message}</p>}
    </fieldset>)}
    {preview && sources.some(source => source.id === preview.id) && <div className="space-y-2"><p className="text-sm text-slate-300">Vista previa · {preview.name}</p><UniversalStreamPlayer key={preview.id + preview.url} event={{ id: `admin-preview-${preview.id}`, title: preview.name, homeTeam: '', awayTeam: '', isLive: true, primaryProvider: 'cloudflare', fallbackOrder: [], sources: [preview], defaultSourceId: preview.id }} /></div>}
    <label className="block text-sm text-slate-300">Añadir canal del catálogo<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar canal por nombre o categoría" className={input} /></label>
    <select aria-label="Añadir canal como fuente" className={input} value="" onChange={e => { const channel = channels.find(c => c.id === e.target.value); if (channel) add({ id: crypto.randomUUID(), name: channel.name, url: channel.streamUrl, type: channel.sourceType === 'iframe' || normalizeExternalPlayerUrl(channel.streamUrl) ? 'iframe' : 'hls', channelId: channel.id }); }}><option value="">Seleccionar un canal para añadir</option>{channels.filter(c => `${c.name} ${c.group || ''}`.toLowerCase().includes(search.toLowerCase())).slice(0, 300).map(c => <option key={c.id} value={c.id}>{c.name} · {c.sourceType === 'iframe' || normalizeExternalPlayerUrl(c.streamUrl) ? 'Iframe' : 'HLS'}</option>)}</select>
    <div className="space-y-2 border-t border-slate-700 pt-3"><h4 className="text-sm text-white font-semibold">Añadir enlace</h4><label className="block text-xs text-slate-300">Nombre de la nueva fuente<input className={input} value={name} onChange={e => setName(e.target.value)} /></label><label className="block text-xs text-slate-300">Tipo de la nueva fuente<select className={input} value={type} onChange={e => setType(e.target.value as EventSource['type'])}><option value="hls">HLS / M3U8</option><option value="iframe">Iframe</option><option value="youtube">YouTube</option><option value="kick">Kick</option></select></label><label className="block text-xs text-slate-300">Enlace o código iframe<input className={input} value={url} onChange={e => setUrl(e.target.value)} /></label><button type="button" className="rounded-lg bg-cyan-700 px-3 py-2 text-white text-sm" onClick={() => add({ id: crypto.randomUUID(), name, type, url })}>Añadir fuente</button></div>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
  </section>;
}
