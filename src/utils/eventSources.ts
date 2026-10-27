import { normalizeChannelSource } from './channelSources';
import type { EventSource, LiveEvent } from '../types/football';
import { normalizeExternalPlayerUrl, normalizeMatchIptvUrl } from './streamUtils';

export function normalizeEventSources(value: unknown): EventSource[] {
  if (!Array.isArray(value) || value.length > 20) throw new Error('Guarda un máximo de 20 fuentes por evento.');
  const ids = new Set<string>();
  return value.map((item: any) => {
    if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{2,80}$/.test(item.id) || ids.has(item.id) || typeof item.name !== 'string' || !item.name.trim()) throw new Error('Cada fuente necesita un nombre y un identificador único.');
    ids.add(item.id);
    let url = '';
    if (item.type === 'hls') url = normalizeMatchIptvUrl(item.url) || '';
    else if (item.type === 'iframe') url = normalizeChannelSource(item.url, 'iframe') || '';
    else if (item.type === 'youtube') {
      const text = String(item.url || '').trim();
      const id = text.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|live\/))([\w-]{11})/)?.[1] || (/^[\w-]{11}$/.test(text) ? text : '');
      if (id) url = `https://www.youtube.com/watch?v=${id}`;
    } else if (item.type === 'kick') {
      const channel = String(item.url || '').trim().replace(/^https:\/\/(?:www\.)?kick\.com\//, '').replace(/\/$/, '');
      if (/^[a-zA-Z0-9_-]{1,80}$/.test(channel)) url = `https://kick.com/${channel}`;
    }
    if (!url) throw new Error(`URL incompatible en la fuente «${item.name}». Comprueba el tipo y el enlace.`);
    return { id: item.id, name: item.name.trim().slice(0, 80), type: item.type, url, ...(item.channelId ? { channelId: String(item.channelId).slice(0, 160) } : {}), ...(item.type === 'hls' && item.waitForBroadcast ? { waitForBroadcast: true } : {}) };
  });
}
export function getEventSources(event?: LiveEvent | null): EventSource[] {
  if (!event) return [];
  if (Array.isArray(event.sources)) return event.sources;
  const sources: EventSource[] = [];
  const add = (source: EventSource) => { try { if (!sources.some(s => s.url === source.url)) sources.push(...normalizeEventSources([source])); } catch {} };
  if (event.cloudflare?.playbackUrl || event.customVideoUrl) add({ id: 'legacy-cloudflare', name: 'Mi transmisión', type: 'hls', url: event.cloudflare?.playbackUrl || event.customVideoUrl!, waitForBroadcast: true });
  if (event.iptvSource?.streamUrl) add({ id: 'legacy-iptv', name: event.iptvSource.channelName || 'Canal IPTV', type: event.iptvSource.sourceType === 'iframe' || normalizeExternalPlayerUrl(event.iptvSource.streamUrl) ? 'iframe' : 'hls', url: event.iptvSource.streamUrl, channelId: event.iptvSource.channelId });
  if (event.externalSource?.url) add({ id: 'legacy-external', name: 'Fuente externa', type: 'iframe', url: event.externalSource.url });
  if (event.youtube?.videoId) add({ id: 'legacy-youtube', name: 'YouTube', type: 'youtube', url: event.youtube.videoId });
  if (event.kick?.channel) add({ id: 'legacy-kick', name: 'Kick', type: 'kick', url: event.kick.channel });
  if (event.backupVideoUrl) add({ id: 'legacy-backup', name: event.backupChannelName || 'Fuente adicional', type: 'hls', url: event.backupVideoUrl });
  return sources;
}
export function getDefaultSourceId(event?: LiveEvent | null): string {
  const sources = getEventSources(event);
  return sources.find(s => s.id === event?.defaultSourceId)?.id || sources.find(s => s.id === `legacy-${event?.primaryProvider || 'cloudflare'}`)?.id || (event?.fallbackOrder || []).map(provider => sources.find(s => s.id === `legacy-${provider}`)?.id).find(Boolean) || sources[0]?.id || '';
}
export function buildEventSourcesPatch(value: unknown, defaultSourceId: string): Partial<LiveEvent> {
  const sources = normalizeEventSources(value);
  if (sources.length && !sources.some(source => source.id === defaultSourceId)) throw new Error('Elige una fuente inicial de la lista.');
  const selected = sources.find(source => source.id === defaultSourceId);
  const patch: Partial<LiveEvent> = { sources, defaultSourceId: selected?.id || '', autoFailoverEnabled: false, activeStreamSource: 'obs', backupVideoUrl: '', backupChannelName: '' };
  if (!selected) return { ...patch, primaryProvider: 'cloudflare', iptvSource: null, externalSource: null, cloudflare: { liveInputId: '', playbackUrl: '' }, customVideoUrl: '', youtube: { videoId: '' }, kick: { channel: '' }, fallbackOrder: ['cloudflare'] };
  if (selected.type === 'hls') {
    patch.primaryProvider = selected.waitForBroadcast ? 'cloudflare' : 'iptv';
    patch.customVideoUrl = selected.url;
    if (selected.waitForBroadcast) patch.cloudflare = { liveInputId: '', playbackUrl: selected.url };
    else patch.iptvSource = { channelId: selected.channelId || selected.id, channelName: selected.name, streamUrl: selected.url, sourceType: 'hls' };
  } else if (selected.type === 'iframe') {
    patch.primaryProvider = 'external'; patch.externalSource = { url: selected.url };
  } else if (selected.type === 'youtube') { patch.primaryProvider = 'youtube'; patch.youtube = { videoId: new URL(selected.url).searchParams.get('v')! }; }
  else { patch.primaryProvider = 'kick'; patch.kick = { channel: new URL(selected.url).pathname.slice(1) }; }
  patch.fallbackOrder = [patch.primaryProvider!];
  return patch;
}
