import express, { Request, Response } from 'express';
import { getCustomIptvChannelsFromFirebase, saveCustomIptvChannelToFirebase, deleteCustomIptvChannelFromFirebase } from './firebase';
import type { IptvChannel } from '../types/iptv';

export const iptvRouter = express.Router();
const SPORTS_M3U_URL = 'https://iptv-org.github.io/iptv/categories/sports.m3u';
const BOLIVIA_M3U_URL = 'https://iptv-org.github.io/iptv/countries/bo.m3u';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
let customChannels: IptvChannel[] = [];
let customLoadedAt = 0;
async function refreshCustomChannels(): Promise<IptvChannel[]> {
  if (Date.now() - customLoadedAt < 30000) return customChannels;
  const saved = await getCustomIptvChannelsFromFirebase();
  customChannels = saved;
  customLoadedAt = Date.now();
  return saved;
}
let cachedChannels: IptvChannel[] = [];
let lastFetchTime = 0;
let activeFetchPromise: Promise<IptvChannel[]> | null = null;

// ── Catálogo deportivo de respaldo de alta disponibilidad ──
// Incluye señales oficiales FAST en vivo y transmisiones diagnósticas documentadas
// Solo señales cuyo nombre coincide con la fuente declarada.
// El catálogo público principal se obtiene de las listas externas; no disfrazar demos como canales reales.
export const CURATED_FALLBACK_CHANNELS: IptvChannel[] = [
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
    await refreshCustomChannels();
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

// Importación de catálogos públicos aprobados. Nunca descargar URLs arbitrarias del usuario:
// evita SSRF, accesos a redes privadas y listas de procedencia desconocida.
export function getApprovedPlaylistUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 500) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'iptv-org.github.io' || url.port || url.username || url.password || url.search || url.hash) return null;
    const parts = url.pathname.split('/');
    if (parts.length !== 4 || parts[0] !== '' || parts[1] !== 'iptv' || !['categories', 'countries'].includes(parts[2]) || !parts[3].endsWith('.m3u') || !/^[a-z0-9-]+$/.test(parts[3].slice(0, -4))) return null;
    return url.href;
  } catch { return null; }
}

// GET /api/iptv/import-preview?lista=<URL> - Vista previa sin persistencia ni reproducción automática.
iptvRouter.get('/import-preview', async (req: Request, res: Response) => {
  const source = getApprovedPlaylistUrl(req.query.lista);
  if (!source) return res.status(400).json({ success: false, error: 'Solo se admiten listas públicas HTTPS de iptv-org (categorías o países).' });
  const channels = await fetchM3uList(source);
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
  return res.json({ success: true, source, total: channels.length, channels, persisted: false });
});

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

    if (typeof res.setHeader === 'function') {
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600');
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
iptvRouter.get('/custom', async (_req: Request, res: Response) => {
  try { await refreshCustomChannels(); } catch { return res.status(503).json({ success: false, error: 'No se pudo consultar Firestore' }); }
  res.json({
    success: true,
    total: customChannels.length,
    channels: customChannels,
  });
});

// POST /api/iptv/custom - Agregar o actualizar canal IPTV desde el dashboard
iptvRouter.post('/custom', async (req: Request, res: Response) => {
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
    await saveCustomIptvChannelToFirebase(newChannel);
    customChannels = [newChannel, ...customChannels.filter((c) => c.streamUrl !== newChannel.streamUrl)];
    customLoadedAt = Date.now();

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
iptvRouter.delete('/custom/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await deleteCustomIptvChannelFromFirebase(id);
    customChannels = customChannels.filter((c) => c.id !== id);
    customLoadedAt = Date.now();
    cachedChannels = cachedChannels.filter((c) => c.id !== id);
    res.json({ success: true, removedId: id });
  } catch { res.status(503).json({ success: false, error: 'No se pudo eliminar el canal en Firestore' }); }
});

// Diagnóstico por ID del catálogo: no acepta URLs arbitrarias del cliente.
// Verifica que el manifiesto HLS sea accesible y tenga estructura M3U, no solo HTTP 200.
iptvRouter.get('/diagnostics/:id', async (req: Request, res: Response) => {
  const channel = [...customChannels, ...cachedChannels].find((c) => c.id === req.params.id);
  if (!channel) return res.status(404).json({ success: false, status: 'not_found', error: 'Canal no encontrado' });
  let url: URL;
  try { url = new URL(channel.streamUrl); } catch { return res.status(422).json({ success: false, status: 'invalid_url' }); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !url.hostname.includes('.')) {
    return res.status(422).json({ success: false, status: 'unsupported_url' });
  }
  // El diagnóstico público solo permite fuentes externas curadas, nunca URLs personalizadas (SSRF).
  if (!CURATED_FALLBACK_CHANNELS.some((c) => c.id === channel.id && c.streamUrl === channel.streamUrl)) {
    return res.status(403).json({ success: false, status: 'requires_admin_validation', error: 'Diagnóstico remoto no habilitado para fuentes externas no verificadas' });
  }
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url.href, { signal: controller.signal, redirect: 'error' });
    const latencyMs = Date.now() - started;
    if (!response.ok) return res.json({ success: true, status: response.status === 403 ? 'restricted' : response.status === 404 ? 'offline' : 'http_error', httpStatus: response.status, latencyMs });
    const body = (await response.text()).slice(0, 200000);
    const valid = body.trimStart().startsWith('#EXTM3U') && (body.includes('#EXT-X-STREAM-INF') || body.includes('#EXTINF'));
    return res.json({ success: true, status: valid ? 'manifest_ok' : 'invalid_manifest', latencyMs, httpStatus: response.status });
  } catch (error) {
    return res.json({ success: true, status: controller.signal.aborted ? 'timeout' : 'network_error', latencyMs: Date.now() - started });
  } finally { clearTimeout(timer); }
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
