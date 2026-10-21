import type { IptvChannel } from '../types/iptv';
import { normalizeExternalPlayerUrl } from './streamUtils';

export function normalizeChannelSource(value: unknown, type: unknown = 'hls'): string | null {
  if (typeof value !== 'string' || value.length > 5000) return null;
  let source = value.trim();
  if (type === 'iframe') {
    if (source.startsWith('<') || source.includes('<iframe')) {
      const match = source.match(/<iframe\b[^>]*\bsrc\s*=\s*(["'])([^"']+)\1/i);
      if (!match) return null;
      source = match[2].replace(/&amp;/g, '&');
    }
    return normalizeExternalPlayerUrl(source);
  }
  if (type !== 'hls' || source.length > 1500 || /\s/.test(source)) return null;
  try {
    const url = new URL(source);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
    if (normalizeExternalPlayerUrl(source)) return null;
    if (/\.(?:html?|php|mpd)$/i.test(url.pathname)) return null;
    return url.href;
  } catch { return null; }
}

export function parseChannelPlaylist(text: string): IptvChannel[] {
  if (text.length > 1024 * 1024) throw new Error('La lista supera el límite de 1 MB.');
  if (!text.trimStart().startsWith('#EXTM3U')) throw new Error('El archivo no es una lista M3U válida.');
  if (/^#EXT-X-TARGETDURATION/m.test(text) || (/^#EXT-X-/m.test(text) && !/#EXTINF:/m.test(text))) {
    throw new Error('Este archivo es una señal HLS. Guarda su URL como canal HLS; no es un catálogo de canales.');
  }
  const channels: IptvChannel[] = [];
  const seen = new Set<string>();
  let info = '';
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('#EXTINF:')) { info = line; continue; }
    if (!line || line.startsWith('#')) continue;
    const metadata = info;
    info = '';
    if (!metadata) continue;
    const sourceType = normalizeExternalPlayerUrl(line) ? 'iframe' : 'hls';
    const streamUrl = normalizeChannelSource(line, sourceType);
    if (!streamUrl || seen.has(streamUrl)) continue;
    seen.add(streamUrl);
    const attribute = (key: string) => metadata.match(new RegExp(key + '="([^"\\n]*)"', 'i'))?.[1] || '';
    channels.push({ id: `import-${channels.length + 1}`, name: metadata.slice(metadata.lastIndexOf(',') + 1).trim() || 'Canal',
      streamUrl, sourceType, logo: attribute('tvg-logo'), group: attribute('group-title') || 'Importados',
      country: attribute('tvg-country') || 'INT', countryName: attribute('tvg-country') || 'Internacional' });
    if (channels.length >= 500) break;
  }
  if (!channels.length) throw new Error('No se encontraron canales compatibles en la lista.');
  return channels;
}
