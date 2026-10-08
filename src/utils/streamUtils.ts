import { LiveEvent, StreamProvider } from '../types/football';

/**
 * Resolves the playback URL for a LiveEvent based strictly on its configured primaryProvider.
 * If the primaryProvider stream is not configured, it gracefully falls back according to fallbackOrder.
 */
export function getStreamUrlForEvent(event?: LiveEvent | null): string {
  if (!event) return '';

  const provider: StreamProvider = event.primaryProvider || 'cloudflare';

  const getUrlByProvider = (p: StreamProvider): string => {
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
  return event.cloudflare?.playbackUrl?.trim() || '';
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
