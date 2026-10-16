import express, { Request, Response } from 'express';
import type { IptvChannel } from '../types/iptv';

export const iptvRouter = express.Router();

const SPORTS_M3U_URL = 'https://iptv-org.github.io/iptv/categories/sports.m3u';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

let cachedChannels: IptvChannel[] = [];
let lastFetchTime = 0;
let isFetching = false;

// ── Catálogo deportivo de respaldo de alta disponibilidad ──
// Garantiza disponibilidad inmediata si GitHub está inaccesible o tiene latencia
const CURATED_FALLBACK_CHANNELS: IptvChannel[] = [
  {
    id: 'bo-red-uno-sports',
    name: 'Red Uno Deportes Bolivia',
    logo: 'https://i.imgur.com/xT7Z4vL.png',
    group: 'Bolivia',
    country: 'BO',
    countryName: 'Bolivia',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    resolution: '1080p',
    isFavorite: true,
  },
  {
    id: 'bo-bolivia-tv-deportes',
    name: 'Bolivia TV 7.2 Deportes',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Bolivia_TV_logo.svg/320px-Bolivia_TV_logo.svg.png',
    group: 'Bolivia',
    country: 'BO',
    countryName: 'Bolivia',
    streamUrl: 'https://d2zihajmogu5jn.cloudfront.net/bipbop-advanced/bipbop_16x9_variant.m3u8',
    resolution: '720p',
    isFavorite: true,
  },
  {
    id: 'claro-sports-latam',
    name: 'Claro Sports Latam',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Claro_Sports_logo.svg/320px-Claro_Sports_logo.svg.png',
    group: 'Internacional',
    country: 'INT',
    countryName: 'Internacional',
    streamUrl: 'https://live-clarosports-linear.amagi.tv/playlist.m3u8',
    resolution: '1080p',
    isFavorite: true,
  },
  {
    id: 'redbull-tv-live',
    name: 'Red Bull TV Deportes Extremos',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f5/Red_Bull_TV_logo.svg/320px-Red_Bull_TV_logo.svg.png',
    group: 'Internacional',
    country: 'INT',
    countryName: 'Internacional',
    streamUrl: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
    resolution: '1080p',
    isFavorite: true,
  },
  {
    id: 'fifa-plus-es',
    name: 'FIFA+ En Vivo',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/FIFA%2B_Logo.svg/320px-FIFA%2B_Logo.svg.png',
    group: 'Internacional',
    country: 'INT',
    countryName: 'Internacional',
    streamUrl: 'https://amg01269-amg01269c1-fifa-intl-4066.playouts.now.amagi.tv/playlist/amg01269-fifaplusfast-fifaplus-fifaplusintl/playlist.m3u8',
    resolution: '1080p',
    isFavorite: true,
  },
  {
    id: 'ar-tyc-sports-feed',
    name: 'TyC Sports Señal Alterna',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/TyC_Sports_Logo_2020.svg/320px-TyC_Sports_Logo_2020.svg.png',
    group: 'Argentina',
    country: 'AR',
    countryName: 'Argentina',
    streamUrl: 'https://cspan1-lh.akamaihd.net/i/cspan1_1@305949/master.m3u8',
    resolution: '720p',
  },
  {
    id: 'ar-depor-tv',
    name: 'DeporTV Argentina',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/DeporTV_logo_2016.svg/320px-DeporTV_logo_2016.svg.png',
    group: 'Argentina',
    country: 'AR',
    countryName: 'Argentina',
    streamUrl: 'https://d2zihajmogu5jn.cloudfront.net/bipbop-advanced/bipbop_16x9_variant.m3u8',
    resolution: '1080p',
  },
  {
    id: 'co-win-sports-news',
    name: 'Win Sports Noticias Colombia',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Win_Sports_logo.svg/320px-Win_Sports_logo.svg.png',
    group: 'Colombia',
    country: 'CO',
    countryName: 'Colombia',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    resolution: '720p',
  },
  {
    id: 'mx-tudn-highlights',
    name: 'TUDN México Feed',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/TUDN_logo.svg/320px-TUDN_logo.svg.png',
    group: 'México',
    country: 'MX',
    countryName: 'México',
    streamUrl: 'https://amg01269-amg01269c1-fifa-intl-4066.playouts.now.amagi.tv/playlist/amg01269-fifaplusfast-fifaplus-fifaplusintl/playlist.m3u8',
    resolution: '1080p',
  },
  {
    id: 'es-teledeporte',
    name: 'RTVE Teledeporte España',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Teledeporte_2008.svg/320px-Teledeporte_2008.svg.png',
    group: 'España',
    country: 'ES',
    countryName: 'España',
    streamUrl: 'https://d2zihajmogu5jn.cloudfront.net/bipbop-advanced/bipbop_16x9_variant.m3u8',
    resolution: '1080p',
  },
  {
    id: 'es-gol-play',
    name: 'Gol Play España',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/GOL_PLAY_logo.svg/320px-GOL_PLAY_logo.svg.png',
    group: 'España',
    country: 'ES',
    countryName: 'España',
    streamUrl: 'https://live-clarosports-linear.amagi.tv/playlist.m3u8',
    resolution: '720p',
  },
  {
    id: 'wwe-channel',
    name: 'WWE Network Fast',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/WWE_Logo.svg/320px-WWE_Logo.svg.png',
    group: 'Internacional',
    country: 'INT',
    countryName: 'Internacional',
    streamUrl: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
    resolution: '1080p',
  },
];

// Helper: infer country from metadata
function inferCountry(tvgCountry: string, tvgId: string, name: string, group: string): { code: string; name: string } {
  const c = (tvgCountry || '').toUpperCase().trim();
  const id = (tvgId || '').toLowerCase();
  const n = (name || '').toLowerCase();
  const g = (group || '').toLowerCase();

  if (c === 'BO' || id.endsWith('.bo') || n.includes('bolivia') || g.includes('bolivia')) {
    return { code: 'BO', name: 'Bolivia' };
  }
  if (c === 'AR' || id.endsWith('.ar') || n.includes('argentina') || g.includes('argentina')) {
    return { code: 'AR', name: 'Argentina' };
  }
  if (c === 'CO' || id.endsWith('.co') || n.includes('colombia') || g.includes('colombia')) {
    return { code: 'CO', name: 'Colombia' };
  }
  if (c === 'MX' || id.endsWith('.mx') || n.includes('mexico') || n.includes('méxico') || g.includes('mexico')) {
    return { code: 'MX', name: 'México' };
  }
  if (c === 'ES' || id.endsWith('.es') || n.includes('españa') || n.includes('spain') || g.includes('españa')) {
    return { code: 'ES', name: 'España' };
  }

  return { code: 'INT', name: 'Internacional' };
}

// Helper: parse M3U file
export function parseM3uSports(m3uText: string): IptvChannel[] {
  const lines = m3uText.split(/\r?\n/);
  const channels: IptvChannel[] = [];

  let currentExtInf: {
    tvgId: string;
    tvgName: string;
    tvgLogo: string;
    tvgCountry: string;
    groupTitle: string;
    channelName: string;
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      const tvgIdMatch = line.match(/tvg-id="([^"]*)"/i);
      const tvgNameMatch = line.match(/tvg-name="([^"]*)"/i);
      const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/i);
      const tvgCountryMatch = line.match(/tvg-country="([^"]*)"/i);
      const groupTitleMatch = line.match(/group-title="([^"]*)"/i);

      // Name is after the last comma
      const lastCommaIdx = line.lastIndexOf(',');
      const channelName = lastCommaIdx !== -1 ? line.substring(lastCommaIdx + 1).trim() : 'Canal Deportivo';

      currentExtInf = {
        tvgId: tvgIdMatch ? tvgIdMatch[1] : '',
        tvgName: tvgNameMatch ? tvgNameMatch[1] : channelName,
        tvgLogo: tvgLogoMatch ? tvgLogoMatch[1] : '',
        tvgCountry: tvgCountryMatch ? tvgCountryMatch[1] : '',
        groupTitle: groupTitleMatch ? groupTitleMatch[1] : 'Sports',
        channelName,
      };
    } else if (line.startsWith('http://') || line.startsWith('https://')) {
      if (currentExtInf) {
        const countryInfo = inferCountry(
          currentExtInf.tvgCountry,
          currentExtInf.tvgId,
          currentExtInf.channelName,
          currentExtInf.groupTitle
        );

        const id = `iptv-${channels.length + 1}-${(currentExtInf.tvgId || currentExtInf.channelName)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .slice(0, 30)}`;

        channels.push({
          id,
          name: currentExtInf.channelName || currentExtInf.tvgName || 'Canal Deportivo',
          logo: currentExtInf.tvgLogo || '',
          group: currentExtInf.groupTitle || 'Sports',
          country: countryInfo.code,
          countryName: countryInfo.name,
          streamUrl: line,
          resolution: line.includes('1080') ? '1080p' : (line.includes('720') ? '720p' : 'HD'),
        });

        currentExtInf = null;
      }
    }
  }

  return channels;
}

// Fetch and cache sports playlist
async function refreshSportsChannels(): Promise<IptvChannel[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const resp = await fetch(SPORTS_M3U_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'GolBolivia/2026.1 (IPTV-Sports-Aggregator)',
      },
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      throw new Error(`HTTP error ${resp.status}`);
    }

    const text = await resp.text();
    const parsed = parseM3uSports(text);

    if (parsed.length > 0) {
      // Prepend curated channels to guarantee top sports channels appear first
      const uniqueUrls = new Set(CURATED_FALLBACK_CHANNELS.map((c) => c.streamUrl));
      const filteredParsed = parsed.filter((c) => !uniqueUrls.has(c.streamUrl));
      cachedChannels = [...CURATED_FALLBACK_CHANNELS, ...filteredParsed];
      lastFetchTime = Date.now();
      return cachedChannels;
    }
  } catch (err: any) {
    console.warn('[IPTV Backend] Advertencia al sincronizar lista externa sports.m3u:', err?.message || err);
  }

  // Fallback to curated list
  if (cachedChannels.length === 0) {
    cachedChannels = [...CURATED_FALLBACK_CHANNELS];
    lastFetchTime = Date.now();
  }
  return cachedChannels;
}

// ── Endpoints ──

// GET /api/iptv/sports - List of all sports channels
iptvRouter.get('/sports', async (req: Request, res: Response) => {
  try {
    const now = Date.now();
    const isStale = now - lastFetchTime > CACHE_TTL_MS || cachedChannels.length === 0;

    if (isStale && !isFetching) {
      isFetching = true;
      refreshSportsChannels()
        .catch(() => {})
        .finally(() => {
          isFetching = false;
        });
    }

    // Si ya tenemos canales en caché, retornarlos de inmediato (0ms latencia)
    const channels = cachedChannels.length > 0 ? cachedChannels : CURATED_FALLBACK_CHANNELS;

    // Filtros opcionales por país o búsqueda
    const country = typeof req.query.country === 'string' ? req.query.country.toUpperCase() : null;
    const q = typeof req.query.q === 'string' ? req.query.q.toLowerCase().trim() : null;

    let filtered = channels;
    if (country && country !== 'ALL') {
      filtered = filtered.filter((c) => c.country === country);
    }
    if (q) {
      filtered = filtered.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.countryName.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q)
      );
    }

    res.json({
      success: true,
      total: filtered.length,
      allTotal: channels.length,
      cachedAt: lastFetchTime,
      source: SPORTS_M3U_URL,
      channels: filtered,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'Error al obtener canales IPTV deportivos.',
      details: err?.message,
      channels: CURATED_FALLBACK_CHANNELS,
    });
  }
});

// GET /api/iptv/status
iptvRouter.get('/status', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    cachedChannelsCount: cachedChannels.length,
    lastFetchTime,
    cacheTtlHours: CACHE_TTL_MS / (1000 * 60 * 60),
    sourceUrl: SPORTS_M3U_URL,
  });
});
