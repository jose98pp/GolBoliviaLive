import { LiveEvent, StreamProvider, MatchIptvSource } from '../types/football';

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

const STREAMXHD_DOMAINS = new Set([
  'streamxhd.st',
  'streamxhd.com',
  'streamxhd.click',
  'streamxhd.top',
  'streamxhd.net',
  'streamxhd.me',
  'streamxhd.live',
]);

const ALLOWED_SPORTS_EMBED_DOMAINS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'player.twitch.tv',
  'twitch.tv',
  'www.twitch.tv',
  'dailymotion.com',
  'www.dailymotion.com',
  'player.vimeo.com',
  'vimeo.com',
  'pelotalibre.org',
  'www.pelotalibre.org',
  'futbollibre.lol',
  'www.futbollibre.lol',
  'librefutboltv.com',
  'www.librefutboltv.com',
  'promiedos.com.ar',
  'www.promiedos.com.ar',
  'embedstream.me',
  'www.embedstream.me',
  'voodc.com',
  'ragnaru.net',
  'casadelfutbol.net',
  'streamwish.to',
  'streamwish.com',
  'filelions.to',
  'luluvdo.com',
  'vidmoly.me',
  'la14hd.com',
  'deportelibre.net',
  'tarjetarojatv.org',
  'rojadirectatv.tv',
  'pirlotv.fr',
  'pirlotv.online',
  'la12hd.com',
  'streamplay.to',
  'ok.ru',
]);

export function normalizeExternalPlayerUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length > 1500) return null;
  const raw = value.trim();
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();

    // StreamXHD validation
    if (STREAMXHD_DOMAINS.has(host)) {
      if (url.pathname !== '/live1.php' && url.pathname !== '/live2.php') return null;
      const streamVal = url.searchParams.get('stream');
      if (!streamVal || !/^[a-zA-Z0-9_-]{1,80}$/.test(streamVal)) return null;
      if ([...url.searchParams.keys()].some((key) => key !== 'stream') || url.searchParams.getAll('stream').length !== 1) {
        return null;
      }
      url.hash = '';
      return url.href;
    }

    // YouTube validation
    if (host === 'youtube.com' || host === 'www.youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
      let videoId = '';
      if (host === 'youtu.be') {
        videoId = url.pathname.slice(1);
      } else if (url.pathname.startsWith('/embed/')) {
        videoId = url.pathname.slice('/embed/'.length);
      } else if (url.pathname === '/watch') {
        videoId = url.searchParams.get('v') || '';
      }
      if (/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
      return null;
    }

    // Other sports embed providers
    if (ALLOWED_SPORTS_EMBED_DOMAINS.has(host)) {
      if (url.pathname.length <= 1 && !url.search) return null;
      url.hash = '';
      return url.href;
    }

    return null;
  } catch {
    return null;
  }
}

export function normalizeMatchIptvSource(value: unknown): MatchIptvSource | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<MatchIptvSource>;
  if (typeof raw.channelId !== 'string' || !raw.channelId.trim()) return null;
  const iframe = normalizeExternalPlayerUrl(raw.streamUrl);
  const streamUrl = iframe || normalizeMatchIptvUrl(raw.streamUrl);
  if (!streamUrl) return null;
  return { channelId: raw.channelId.trim().slice(0, 160), channelName: String(raw.channelName || 'Canal IPTV').trim().slice(0, 120),
    streamUrl, sourceType: iframe ? 'iframe' : 'hls', category: String(raw.category || '').trim().slice(0, 80) };
}

export function assertConfirmedMatchSignal(expected: LiveEvent, confirmed: LiveEvent): void {
  const signal = (event: LiveEvent) => JSON.stringify({ primaryProvider: event.primaryProvider,
    iptvSource: normalizeMatchIptvSource(event.iptvSource), externalSource: normalizeExternalPlayerUrl(event.externalSource?.url),
    fallbackOrder: event.fallbackOrder, activeStreamSource: event.activeStreamSource || 'obs', broadcastMode: event.broadcastMode || 'obs_custom' });
  if (signal(expected) !== signal(confirmed)) throw new Error('El servidor no confirmó la señal seleccionada. Recarga el partido y vuelve a guardar.');
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
