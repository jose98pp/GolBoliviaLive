import { assertPublicHttpUrl } from '../../api/proxy.js';
import { parseChannelPlaylist } from '../utils/channelSources';
import type { IptvChannel } from '../types/iptv';

const MAX_BYTES = 1024 * 1024;
export function normalizePlaylistUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 4000) return null;
  try {
    const url = new URL(value.trim());
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    url.hash = '';
    return url.href;
  } catch { return null; }
}

export async function fetchPlaylistPreview(source: string): Promise<IptvChannel[]> {
  const signal = AbortSignal.timeout(12000);
  let url = normalizePlaylistUrl(source);
  if (!url) throw new Error('Introduce una URL HTTP o HTTPS válida de lista M3U/M3U8.');
  for (let redirects = 0; redirects <= 5; redirects++) {
    await assertPublicHttpUrl(url);
    const response = await fetch(url, { redirect: 'manual', signal });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location || redirects === 5) throw new Error('La lista tiene demasiadas redirecciones o un destino inválido.');
      url = normalizePlaylistUrl(new URL(location, url).href);
      if (!url) throw new Error('Redirección de lista no compatible.');
      continue;
    }
    if (!response.ok) { await response.body?.cancel(); throw new Error(`El proveedor de la lista respondió HTTP ${response.status}.`); }
    if (Number(response.headers.get('content-length')) > MAX_BYTES) { await response.body?.cancel(); throw new Error('La lista supera el límite de 1 MB.'); }
    const reader = response.body?.getReader();
    if (!reader) throw new Error('La lista está vacía.');
    const decoder = new TextDecoder();
    let size = 0; let text = '';
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > MAX_BYTES) { await reader.cancel(); throw new Error('La lista supera el límite de 1 MB.'); }
        text += decoder.decode(chunk.value, { stream: true });
      }
      text += decoder.decode();
    } finally { reader.releaseLock(); }
    if (!text.trimStart().startsWith('#EXTM3U')) throw new Error('La dirección no devolvió una lista M3U/M3U8 válida; puede ser una página HTML o requerir acceso.');
    if (/^#EXT-X-(?:TARGETDURATION|STREAM-INF|MEDIA-SEQUENCE|VERSION):/m.test(text)) {
      return [{ id: 'import-hls', name: `Señal HLS · ${new URL(url).hostname}`, streamUrl: url, sourceType: 'hls', logo: '', group: 'Importados', country: 'INT', countryName: 'Internacional' }];
    }
    return parseChannelPlaylist(text, url);
  }
  throw new Error('No se pudo descargar la lista.');
}
