import express, { Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import type { IptvChannel } from '../types/iptv';

export const iptvRouter = express.Router();

const SPORTS_M3U_URL = 'https://iptv-org.github.io/iptv/categories/sports.m3u';
const BOLIVIA_M3U_URL = 'https://iptv-org.github.io/iptv/countries/bo.m3u';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas
const CUSTOM_CHANNELS_FILE = path.join(process.cwd(), 'data', 'custom-iptv-channels.json');

function loadCustomChannels(): IptvChannel[] {
  try {
    if (fs.existsSync(CUSTOM_CHANNELS_FILE)) {
      const raw = fs.readFileSync(CUSTOM_CHANNELS_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn('[IPTV Backend] Advertencia al leer canales personalizados locales:', err);
  }
  return [];
}

function saveCustomChannels(channels: IptvChannel[]): void {
  try {
    const dir = path.dirname(CUSTOM_CHANNELS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CUSTOM_CHANNELS_FILE, JSON.stringify(channels, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[IPTV Backend] Advertencia al persistir canales personalizados locales:', err);
  }
}

let customChannels: IptvChannel[] = loadCustomChannels();
let cachedChannels: IptvChannel[] = [];
let lastFetchTime = 0;
let activeFetchPromise: Promise<IptvChannel[]> | null = null;

// ── Catálogo deportivo de respaldo de alta disponibilidad ──
// Incluye señales oficiales FAST en vivo y transmisiones diagnósticas documentadas
export const CURATED_FALLBACK_CHANNELS: IptvChannel[] = [
  {
    id: 'bo-senal-principal-futbol',
    name: 'Señal Principal - Fútbol Boliviano',
    logo: 'https://golbolivialive-beta.vercel.app/favicon.svg',
    group: 'Bolivia',
    country: 'BO',
    countryName: 'Bolivia',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    resolution: '1080p',
    isFavorite: true,
    isDemoFeed: false,
    notes: 'Transmisión en vivo oficial destacada del fútbol boliviano.',
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
    isDemoFeed: false,
    notes: 'Señal oficial FAST 24/7 en vivo vía Amagi CDN.',
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
    isDemoFeed: false,
    notes: 'Señal oficial Red Bull TV Live en vivo vía Akamai.',
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
    isDemoFeed: false,
    notes: 'Señal oficial FIFA+ FAST 24/7 en español.',
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
    isDemoFeed: false,
    notes: 'Feed FAST de deportes de contacto.',
  },
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
    isDemoFeed: true,
    notes: 'Feed de prueba HLS para verificación técnica. Señal oficial sujeta a geobloqueo.',
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
    isDemoFeed: true,
    notes: 'Feed de prueba HLS para verificación técnica en Bolivia.',
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
    isDemoFeed: true,
    notes: 'Feed de respaldo alternativo Akamai para pruebas de conectividad.',
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
    isDemoFeed: true,
    notes: 'Feed de diagnóstico BipBop para validación en Argentina.',
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
    isDemoFeed: true,
    notes: 'Feed de prueba Mux HLS para diagnóstico técnico en Colombia.',
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
    isDemoFeed: false,
    notes: 'Feed alternativo FAST en español para México.',
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
    isDemoFeed: true,
    notes: 'Feed de prueba HLS para verificación técnica en España.',
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
    isDemoFeed: false,
    notes: 'Feed deportivo FAST en español.',
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

// Helper: parse M3U file with optional default country
export function parseM3uSports(m3uText: string, defaultCountry?: string): IptvChannel[] {
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
        tvgCountry: tvgCountryMatch ? tvgCountryMatch[1] : (defaultCountry || ''),
        groupTitle: groupTitleMatch ? groupTitleMatch[1] : (defaultCountry === 'BO' ? 'TV Abierta' : 'Sports'),
        channelName,
      };
    } else if (line.startsWith('http://') || line.startsWith('https://')) {
      if (currentExtInf) {
        const countryInfo = defaultCountry && defaultCountry.toUpperCase() === 'BO'
          ? { code: 'BO', name: 'Bolivia' }
          : inferCountry(
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
          group: currentExtInf.groupTitle || (countryInfo.code === 'BO' ? 'Bolivia' : 'Sports'),
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

// Helper to fetch and parse an M3U playlist safely with timeout
async function fetchM3uList(url: string, defaultCountry?: string): Promise<IptvChannel[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const resp = await fetch(url, {
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
    return parseM3uSports(text, defaultCountry);
  } catch (err: any) {
    console.warn(`[IPTV Backend] Advertencia al sincronizar lista externa (${url}):`, err?.message || err);
    return [];
  }
}

// Fetch and cache combined sports and Bolivian national playlists
async function refreshSportsChannels(): Promise<IptvChannel[]> {
  try {
    const [boResult, sportsResult] = await Promise.allSettled([
      fetchM3uList(BOLIVIA_M3U_URL, 'BO'),
      fetchM3uList(SPORTS_M3U_URL),
    ]);

    const boChannels = boResult.status === 'fulfilled' ? boResult.value : [];
    const sportsChannels = sportsResult.status === 'fulfilled' ? sportsResult.value : [];
    const combinedParsed = [...boChannels, ...sportsChannels];

    if (combinedParsed.length > 0) {
      // Prepend custom channels and curated channels to guarantee top sports channels appear first
      const uniqueUrls = new Set([
        ...customChannels.map((c) => c.streamUrl),
        ...CURATED_FALLBACK_CHANNELS.map((c) => c.streamUrl),
      ]);
      const filteredParsed: IptvChannel[] = [];
      for (const ch of combinedParsed) {
        if (!uniqueUrls.has(ch.streamUrl)) {
          uniqueUrls.add(ch.streamUrl);
          filteredParsed.push(ch);
        }
      }

      cachedChannels = [...customChannels, ...CURATED_FALLBACK_CHANNELS, ...filteredParsed];
      lastFetchTime = Date.now();
      return cachedChannels;
    }
  } catch (err: any) {
    console.warn('[IPTV Backend] Advertencia al sincronizar listas M3U externas:', err?.message || err);
  }

  // Fallback to custom channels + curated list
  if (cachedChannels.length === 0) {
    cachedChannels = [...customChannels, ...CURATED_FALLBACK_CHANNELS];
    lastFetchTime = Date.now();
  }
  return cachedChannels;
}

/**
 * Obtiene los canales cacheados o espera a que termine la actualización activa,
 * deduplicando solicitudes concurrentes mediante una promesa compartida.
 */
export function getOrRefreshSportsChannels(force = false): Promise<IptvChannel[]> {
  const now = Date.now();
  const isStale = force || now - lastFetchTime > CACHE_TTL_MS || cachedChannels.length === 0;

  if (!isStale && cachedChannels.length > 0) {
    return Promise.resolve(cachedChannels);
  }

  // Si ya hay una promesa de actualización en curso, compartirla entre solicitudes concurrentes
  if (activeFetchPromise) {
    return activeFetchPromise;
  }

  activeFetchPromise = refreshSportsChannels()
    .catch((err: any) => {
      console.warn('[IPTV Backend] Error durante la actualización de canales:', err?.message || err);
      if (cachedChannels.length > 0) return cachedChannels;
      return [...customChannels, ...CURATED_FALLBACK_CHANNELS];
    })
    .finally(() => {
      activeFetchPromise = null;
    });

  return activeFetchPromise;
}

// ── Endpoints ──

// GET /api/iptv/sports - List of all sports channels
iptvRouter.get('/sports', async (req: Request, res: Response) => {
  try {
    const force = req.query.refresh === 'true';
    // Esperar la actualización de la lista M3U compartiendo la misma promesa entre solicitudes concurrentes
    const channels = await getOrRefreshSportsChannels(force);

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
    customChannelsCount: customChannels.length,
    lastFetchTime,
    isUpdating: Boolean(activeFetchPromise),
    cacheTtlHours: CACHE_TTL_MS / (1000 * 60 * 60),
    sourceUrl: SPORTS_M3U_URL,
  });
});

// GET /api/iptv/custom - Obtener canales personalizados cargados desde el dashboard
iptvRouter.get('/custom', (_req: Request, res: Response) => {
  res.json({
    success: true,
    total: customChannels.length,
    channels: customChannels,
  });
});

// POST /api/iptv/custom - Agregar o actualizar canal IPTV desde el dashboard
iptvRouter.post('/custom', (req: Request, res: Response) => {
  try {
    const { name, streamUrl, country, countryName, group, resolution, logo, notes } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'El nombre del canal es requerido.' });
    }
    if (!streamUrl || typeof streamUrl !== 'string' || !streamUrl.trim().startsWith('http')) {
      return res.status(400).json({ success: false, error: 'La URL del stream debe comenzar con http:// o https://' });
    }

    const cCountry = (country || 'BO').toString().toUpperCase().trim();
    const cCountryName = countryName?.trim() || (cCountry === 'BO' ? 'Bolivia' : cCountry === 'INT' ? 'Internacional' : cCountry);

    const newChannel: IptvChannel = {
      id: `custom-iptv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      streamUrl: streamUrl.trim(),
      country: cCountry,
      countryName: cCountryName,
      group: group?.trim() || 'Fútbol Boliviano',
      resolution: resolution?.trim() || '1080p',
      logo: logo?.trim() || '',
      isCustom: true,
      isDemoFeed: false,
      notes: notes?.trim() || 'Canal configurado manualmente desde el panel de administración.',
      createdAt: new Date().toISOString(),
    };

    // Agregar al inicio de canales personalizados
    customChannels = [newChannel, ...customChannels.filter((c) => c.streamUrl !== newChannel.streamUrl)];
    saveCustomChannels(customChannels);

    // Actualizar la caché activa inmediatamente anteponiendo el canal
    cachedChannels = [
      newChannel,
      ...cachedChannels.filter((c) => c.id !== newChannel.id && c.streamUrl !== newChannel.streamUrl),
    ];

    res.json({
      success: true,
      message: 'Canal IPTV registrado exitosamente.',
      channel: newChannel,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error guardando canal IPTV' });
  }
});

// DELETE /api/iptv/custom/:id - Eliminar canal IPTV personalizado
iptvRouter.delete('/custom/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  customChannels = customChannels.filter((c) => c.id !== id);
  saveCustomChannels(customChannels);
  cachedChannels = cachedChannels.filter((c) => c.id !== id);
  res.json({ success: true, removedId: id });
});

// POST /api/iptv/probe - Probar conectividad y latencia de señal .m3u8 en vivo
iptvRouter.post('/probe', async (req: Request, res: Response) => {
  const { streamUrl } = req.body || {};
  if (!streamUrl || typeof streamUrl !== 'string') {
    return res.status(400).json({ success: false, error: 'streamUrl es requerido' });
  }

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(streamUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': 'GolBolivia/2026.1 (Channel-Probe)' },
    });
    clearTimeout(timeout);
    const latencyMs = Date.now() - startTime;

    res.json({
      success: true,
      reachable: resp.ok || resp.status < 400,
      status: resp.status,
      statusText: resp.statusText,
      contentType: resp.headers.get('content-type') || '',
      latencyMs,
    });
  } catch (err: any) {
    res.json({
      success: false,
      reachable: false,
      error: err?.message || 'Tiempo de espera agotado al conectar con el stream',
      latencyMs: Date.now() - startTime,
    });
  }
});

// ── Test helpers ──
export function resetIptvCacheForTest(): void {
  cachedChannels = [];
  lastFetchTime = 0;
  activeFetchPromise = null;
}

export function setCachedChannelsForTest(channels: IptvChannel[], fetchTime = Date.now()): void {
  cachedChannels = [...channels];
  lastFetchTime = fetchTime;
}

export function getCachedChannelsForTest(): IptvChannel[] {
  return cachedChannels;
}

export function getActiveFetchPromiseForTest(): Promise<IptvChannel[]> | null {
  return activeFetchPromise;
}

export function resetCustomChannelsForTest(): void {
  customChannels = [];
}

export function setCustomChannelsForTest(channels: IptvChannel[]): void {
  customChannels = [...channels];
}

export function getCustomChannelsForTest(): IptvChannel[] {
  return customChannels;
}
