import { LiveEvent, StreamProvider } from '../types/football';

/** Valida una referencia HLS; la disponibilidad y la seguridad del destino se comprueban al reproducir. */
export function normalizeMatchIptvUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const source = value.trim();
  if (!source || source.length > 1500 || /\s/.test(source)) return null;
  try {
    const url = new URL(source);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
    if (!/\.m3u8?$/i.test(url.pathname)) return null;
    return url.href.length <= 1500 ? url.href : null;
  } catch {
    return null;
  }
}

export function normalizeExternalPlayerUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length > 1500) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    if (!['streamxhd.st', 'streamxhd.com', 'streamxhd.click'].includes(url.hostname)) return null;
    if (url.pathname !== '/live1.php' || !/^[a-zA-Z0-9_-]{1,80}$/.test(url.searchParams.get('stream') || '')) return null;
    if ([...url.searchParams.keys()].some(key => key !== 'stream') || url.searchParams.getAll('stream').length !== 1) return null;
    url.hash = '';
    return url.href;
  } catch { return null; }
}

/**
 * Resolves the playback URL for a LiveEvent based strictly on its configured primaryProvider.
 * If the primaryProvider stream is not configured, it gracefully falls back according to fallbackOrder.
 */
export function getStreamUrlForEvent(event?: LiveEvent | null): string {
  if (!event) return '';

  const provider: StreamProvider = event.primaryProvider || 'cloudflare';

  const getUrlByProvider = (p: StreamProvider): string => {
    if (p === 'external') return normalizeExternalPlayerUrl(event.externalSource?.url) || '';
    if (p === 'iptv') return event.iptvSource?.streamUrl?.trim() || '';
    if (p === 'kick' && event.kick?.channel?.trim()) {
      const channel = event.kick.channel.trim().replace(/^https?:\/\/(?:www\.)?kick\.com\//, '');
      return `https://kick.com/${channel}`;
    }
    if (p === 'youtube' && event.youtube?.videoId?.trim()) {
      const id = event.youtube.videoId.trim().replace(/^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=/, '');
      return `https://www.youtube.com/watch?v=${id}`;
    }
    if (p === 'cloudflare' && event.cloudflare?.playbackUrl?.trim()) {
      return event.cloudflare.playbackUrl.trim();
    }
    return '';
  };

  // 1. Try primary provider first
  const primaryUrl = getUrlByProvider(provider);
  if (primaryUrl) return primaryUrl;

  // 2. Try fallback providers in configured order
  const fallbacks = event.fallbackOrder || ['cloudflare', 'youtube', 'kick'];
  for (const fb of fallbacks) {
    if (fb === provider) continue; // Already tried
    const fallbackUrl = getUrlByProvider(fb);
    if (fallbackUrl) return fallbackUrl;
  }

  // 3. Last resort fallback
  return event.iptvSource?.streamUrl?.trim() || event.cloudflare?.playbackUrl?.trim() || '';
}

/**
 * Detects the stream provider from a raw URL.
 */
export function detectProviderFromUrl(url: string): StreamProvider {
  if (!url) return 'cloudflare';
  const clean = url.trim().toLowerCase();
  if (clean.includes('kick.com/')) return 'kick';
  if (clean.includes('youtube.com/') || clean.includes('youtu.be/')) return 'youtube';
  return 'cloudflare';
}

/**
 * Wraps external HTTP streams with the Vercel serverless /api/proxy to prevent Mixed Content
 * blocking on HTTPS, and allows passing arbitrary streams through the CORS proxy.
 */
export function getProxiedStreamUrl(url?: string | null, forceProxy = false): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Already proxied or relative
  if (trimmed.startsWith('/api/proxy') || trimmed.startsWith('/proxy')) {
    return trimmed;
  }

  // External HTTP stream MUST be proxied to prevent browser Mixed Content error on HTTPS (Vercel)
  if (trimmed.startsWith('http://') || forceProxy) {
    return `/api/proxy?url=${encodeURIComponent(trimmed)}`;
  }

  return trimmed;
}
