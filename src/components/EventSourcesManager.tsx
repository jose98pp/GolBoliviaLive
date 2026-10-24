import React, { useEffect, useRef, useState } from 'react';
import type { EventSource, LiveEvent } from '../types/football';
import type { IptvChannel } from '../types/iptv';
import { iptvService } from '../services/iptvService';
import { buildEventSourcesPatch, getDefaultSourceId, getEventSources } from '../utils/eventSources';
import { EventSourcesEditor } from './EventSourcesEditor';

export function EventSourcesManager({ event, onSave }: { event?: LiveEvent; onSave: (patch: Partial<LiveEvent>) => Promise<LiveEvent> }) {
  const [sources, setSources] = useState<EventSource[]>(() => getEventSources(event));
  const [defaultId, setDefaultId] = useState(() => getDefaultSourceId(event));
  const [channels, setChannels] = useState<IptvChannel[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const draft = useRef('');
  draft.current = JSON.stringify([sources, defaultId]);
  useEffect(() => { if (!dirty) { setSources(getEventSources(event)); setDefaultId(getDefaultSourceId(event)); } }, [event, dirty]);
  useEffect(() => {
    let disposed = false;
    Promise.allSettled([iptvService.getChannels(), iptvService.getCustomChannels()]).then(results => {
      if (disposed) return;
      const merged = new Map<string, IptvChannel>();
      for (const result of results) if (result.status === 'fulfilled') for (const channel of result.value) merged.set(channel.id, channel);
      setChannels([...merged.values()]);
    });
    return () => { disposed = true; };
  }, []);
  if (!event) return <p className="text-slate-300">Crea o selecciona un evento en Eventos → Marcador para guardar sus fuentes.</p>;
  return <div className="space-y-3"><h2 className="text-lg font-bold text-white">Señales · {event.title}</h2><EventSourcesEditor sources={sources} defaultId={defaultId} channels={channels} onChange={(list, initial) => { setSources(list); setDefaultId(initial); setDirty(true); setMessage(''); }} />
    <button type="button" disabled={busy || !dirty} className="rounded-xl bg-emerald-600 text-white px-4 py-3 font-bold disabled:opacity-50" onClick={async () => { const submitted = draft.current; setBusy(true); try { const saved = await onSave(buildEventSourcesPatch(sources, defaultId)); if (draft.current === submitted) { setSources(getEventSources(saved)); setDefaultId(getDefaultSourceId(saved)); setDirty(false); setMessage('Fuentes guardadas y publicadas para este evento.'); } else setMessage('Se guardó la versión enviada; tienes cambios nuevos pendientes de guardar.'); } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'No se guardaron las fuentes.'); } finally { setBusy(false); } }}>{busy ? 'Guardando…' : 'Guardar fuentes del evento'}</button>
    {message && <p role="status" className="text-sm text-slate-300">{message}</p>}
  </div>;
}
