import express, { Request, Response } from 'express';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { getCustomIptvChannelsFromFirebase, saveCustomIptvChannelToFirebase, deleteCustomIptvChannelFromFirebase } from './firebase';
import { normalizeChannelSource } from '../utils/channelSources';
import type { IptvChannel } from '../types/iptv';

import { CURATED_FALLBACK_CHANNELS } from '../data/iptvFallbackChannels';
export { CURATED_FALLBACK_CHANNELS } from '../data/iptvFallbackChannels';

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

export function mergeChannelCatalog(custom: IptvChannel[], catalog: IptvChannel[]): IptvChannel[] {
  const hidden = new Set(custom.flatMap(channel => [channel.streamUrl, channel.originalStreamUrl || '']));
  return [...custom, ...catalog.filter(channel => {
    if (hidden.has(channel.streamUrl)) return false;
    hidden.add(channel.streamUrl);
    return true;
  })];
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
      cachedChannels = mergeChannelCatalog(customChannels, [...CURATED_FALLBACK_CHANNELS, ...combinedParsed]);
      lastFetchTime = Date.now();
      return cachedChannels;
    }
  } catch (err: any) {
    console.warn('[IPTV Backend] Advertencia al sincronizar listas M3U externas:', err?.message || err);
  }

  // Fallback to custom channels + curated list
  if (cachedChannels.length === 0) {
    cachedChannels = mergeChannelCatalog(customChannels, CURATED_FALLBACK_CHANNELS);
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
      return mergeChannelCatalog(customChannels, CURATED_FALLBACK_CHANNELS);
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
    const { editingId, editingStreamUrl, name, streamUrl, sourceType = 'hls', country, countryName, group, resolution, logo, notes } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'El nombre del canal es requerido.' });
    }
    const normalizedSource = normalizeChannelSource(streamUrl, sourceType);
    if (!normalizedSource) return res.status(400).json({ success: false, error: 'Fuente no compatible. Usa una URL HLS HTTP/HTTPS o un iframe HTTPS de los dominios admitidos.' });

    await refreshCustomChannels();
    const existing = editingId ? [...customChannels, ...cachedChannels, ...CURATED_FALLBACK_CHANNELS]
      .find(channel => channel.id === editingId && channel.streamUrl === editingStreamUrl) : undefined;
    if (editingId && !existing) return res.status(409).json({ success: false, error: 'El canal cambió o ya no existe. Recarga el catálogo antes de editar.' });
    if (existing && !existing.isCustom && customChannels.some(channel => channel.originalStreamUrl === existing.streamUrl)) {
      return res.status(409).json({ success: false, error: 'Este canal ya tiene una versión administrada. Recarga el catálogo y edita esa versión.' });
    }
    if (customChannels.some(channel => channel.streamUrl === normalizedSource && channel.id !== existing?.id)) {
      return res.status(409).json({ success: false, error: 'Ya existe otro canal personalizado con esa URL.' });
    }
    const cCountry = (country || 'BO').toString().toUpperCase().trim();
    const cCountryName = countryName?.trim() || (cCountry === 'BO' ? 'Bolivia' : cCountry === 'INT' ? 'Internacional' : cCountry);

    const newChannel: IptvChannel = {
      id: existing?.isCustom ? existing.id : `custom-iptv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      streamUrl: normalizedSource,
      sourceType,
      country: cCountry,
      countryName: cCountryName,
      group: group?.trim() || 'Fútbol Boliviano',
      resolution: resolution?.trim() || '1080p',
      logo: logo?.trim() || '',
      isCustom: true,
      isDemoFeed: false,
      notes: notes?.trim() || 'Canal configurado manualmente desde el panel de administración.',
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(existing?.originalStreamUrl || (existing && !existing.isCustom) ? { originalStreamUrl: existing.originalStreamUrl || existing.streamUrl } : {}),
    };

    // Agregar al inicio de canales personalizados
    await saveCustomIptvChannelToFirebase(newChannel);
    customChannels = [newChannel, ...customChannels.filter((c) => c.id !== newChannel.id)];
    customLoadedAt = Date.now();

    // Actualizar la caché activa inmediatamente anteponiendo el canal
    cachedChannels = [
      newChannel,
      ...cachedChannels.filter((c) => c.id !== newChannel.id && c.streamUrl !== newChannel.streamUrl && c.streamUrl !== newChannel.originalStreamUrl),
    ];

    res.json({
      success: true,
      message: 'Canal IPTV registrado exitosamente.',
      channel: newChannel,
    });
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.code === 'firestore/permission-denied') {
      return res.status(403).json({ success: false, code: 'FIRESTORE_PERMISSION_DENIED', error: 'Firestore denegó el guardado. Publica las reglas para iptvCustomChannels y verifica el usuario Firebase del backend y su documento admins/{UID}.' });
    }
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
    lastFetchTime = 0;
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

// Defensa básica SSRF: no permitir IPs privadas, loopback, link-local ni hostnames internos.
async function isPublicProbeUrl(value: string): Promise<boolean> {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hostname === 'localhost' || url.hostname.endsWith('.local')) return false;
    const addresses = await lookup(url.hostname, { all: true });
    if (!addresses.length) return false;
    return addresses.every(({ address }) => {
      if (isIP(address) === 4) {
        const p = address.split('.').map(Number);
        return !(p[0] === 0 || p[0] === 10 || p[0] === 127 || p[0] >= 224 || p[0] === 169 && p[1] === 254 || p[0] === 172 && p[1] >= 16 && p[1] <= 31 || p[0] === 192 && p[1] === 168 || p[0] === 100 && p[1] >= 64 && p[1] <= 127 || p[0] === 192 && p[1] === 0);
      }
      const ip = address.toLowerCase();
      return !(/^(::1|::|fc|fd|fe8|fe9|fea|feb)/.test(ip) || ip.startsWith('::ffff:'));
    });
  } catch { return false; }
}

// POST /api/iptv/probe - Probar conectividad y latencia de señal .m3u8 en vivo
iptvRouter.post('/probe', async (req: Request, res: Response) => {
  const { streamUrl } = req.body || {};
  if (!streamUrl || typeof streamUrl !== 'string') {
    return res.status(400).json({ success: false, error: 'streamUrl es requerido' });
  }

  if (!(await isPublicProbeUrl(streamUrl))) return res.status(422).json({ success: false, reachable: false, error: 'URL no permitida: usa HTTPS público.' });
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(streamUrl, {
      method: 'GET',
      redirect: 'error',
      signal: controller.signal,
      headers: { 'User-Agent': 'GolBolivia/2026.1 (Channel-Probe)' },
    });
    const latencyMs = Date.now() - startTime;
    const contentType = resp.headers.get('content-type') || '';
    let manifestValid = false;
    let mediaReferenceFound = false;
    if (resp.ok && (streamUrl.toLowerCase().includes('.m3u8') || contentType.includes('mpegurl'))) {
      const text = (await resp.text()).slice(0, 200000);
      manifestValid = text.trimStart().startsWith('#EXTM3U');
      mediaReferenceFound = manifestValid && (text.includes('#EXT-X-STREAM-INF') || text.includes('#EXTINF'));
    } else { await resp.body?.cancel(); }
    clearTimeout(timeout);
    res.json({
      success: true,
      reachable: resp.ok && manifestValid && mediaReferenceFound,
      status: resp.status,
      statusText: resp.statusText,
      contentType,
      latencyMs,
      manifestValid,
      mediaReferenceFound,
      playbackVerified: false,
      error: !resp.ok ? `HTTP ${resp.status}` : !manifestValid ? 'La respuesta no es un manifiesto HLS válido' : !mediaReferenceFound ? 'No se encontraron variantes o segmentos' : undefined,
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
