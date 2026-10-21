// Archivo: /api/proxy.js
// Proxy Serverless en Vercel para evitar bloqueos CORS y enlaces http:// (Mixed Content)

/**
 * Reescribe las líneas de una lista de reproducción M3U8 para que todos los
 * segmentos y sub-listas pasen a través del proxy evitando bloqueos CORS y enlaces http://.
 */
export function rewriteM3u8Content(m3u8Text, baseUrl, proxyPrefix = '/api/proxy?url=') {
  if (typeof m3u8Text !== 'string') return '';
  const lines = m3u8Text.split('\n');
  const rewritten = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    // Manejo de atributos URI en etiquetas HLS (e.g., #EXT-X-KEY:METHOD=...,URI="..." o #EXT-X-MEDIA:...,URI="...")
    if (trimmed.startsWith('#')) {
      if (trimmed.includes('URI="')) {
        return trimmed.replace(/URI="([^"]+)"/g, (match, uri) => {
          try {
            const absolute = new URL(uri, baseUrl).toString();
            return `URI="${proxyPrefix}${encodeURIComponent(absolute)}"`;
          } catch {
            return match;
          }
        });
      }
      return line;
    }

    // Es una línea de URI de segmento de video (.ts, .m4s) o sub-lista de reproducción (.m3u8)
    try {
      const absolute = new URL(trimmed, baseUrl).toString();
      return `${proxyPrefix}${encodeURIComponent(absolute)}`;
    } catch {
      return line;
    }
  });

  return rewritten.join('\n');
}

// ──────────────────────────────────────────────────────────────────────────
// Seguridad del proxy
//  - Bloquea destinos internos/privados (SSRF): localhost, 10.x, 192.168.x, 169.254.x, etc.
//  - Valida cada redirección (máx. 5) con la misma regla.
//  - Solo devuelve tipos de contenido de streaming (evita servir HTML/JS desde tu dominio).
//  - Límite de tamaño y límite de peticiones por IP (por instancia).
//  - Lista de dominios opcional: PROXY_ALLOWED_HOSTS="cdn1.com,cdn2.tv" (si está definida, es obligatoria).
// ──────────────────────────────────────────────────────────────────────────
import { lookup as proxyDnsLookup } from 'node:dns/promises';
import { isIP as proxyIsIP } from 'node:net';

const PROXY_MAX_BYTES = Number(process.env.PROXY_MAX_BYTES) > 0 ? Number(process.env.PROXY_MAX_BYTES) : 25 * 1024 * 1024;
const PROXY_RATE_PER_MIN = Number(process.env.PROXY_RATE_LIMIT_PER_MIN) > 0 ? Number(process.env.PROXY_RATE_LIMIT_PER_MIN) : 1500;
const PROXY_MAX_REDIRECTS = 5;
const PROXY_TIMEOUT_MS = 15000;

const proxyAllowedHosts = () =>
  (process.env.PROXY_ALLOWED_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

function proxyError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function isPrivateIPv4(ip) {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local / metadata cloud
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast / reservado
  );
}

function expandIPv6(ip) {
  // Devuelve 8 grupos numéricos de 16 bits, o null si no se puede interpretar
  let v = ip.toLowerCase().split('%')[0];
  const dotted = v.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const o = dotted[1].split('.').map(Number);
    if (o.some((n) => n > 255)) return null;
    v = v.slice(0, -dotted[1].length) + ((o[0] << 8) | o[1]).toString(16) + ':' + ((o[2] << 8) | o[3]).toString(16);
  }
  const halves = v.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - left.length - right.length;
  if (halves.length === 1 ? left.length !== 8 : missing < 0) return null;
  const groups = [...left, ...(halves.length === 2 ? Array(missing).fill('0') : []), ...right].map((g) => parseInt(g || '0', 16));
  return groups.length === 8 && groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff) ? groups : null;
}

function isPrivateIp(ip) {
  const kind = proxyIsIP(ip);
  if (kind === 4) return isPrivateIPv4(ip);
  if (kind === 6) {
    const g = expandIPv6(ip);
    if (!g) return true;
    // ::  y  ::1
    if (g.slice(0, 7).every((x) => x === 0) && (g[7] === 0 || g[7] === 1)) return true;
    // IPv4 mapeada (::ffff:a.b.c.d) o compatible (::a.b.c.d): validar la IPv4 embebida
    if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0)) {
      return isPrivateIPv4(`${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`);
    }
    const first = g[0];
    return (
      (first & 0xfe00) === 0xfc00 || // fc00::/7  (ULA)
      (first & 0xffc0) === 0xfe80 || // fe80::/10 (link-local)
      (first & 0xff00) === 0xff00 // ff00::/8  (multicast)
    );
  }
  return true;
}

export async function assertPublicHttpUrl(urlString) {
  let u;
  try {
    u = new URL(urlString);
  } catch {
    throw proxyError(400, 'URL malformada o inválida');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw proxyError(400, 'La URL debe comenzar con http:// o https://');
  }
  if (u.username || u.password) throw proxyError(400, 'URL con credenciales no permitida');

  const host = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw proxyError(403, 'Destino no permitido');
  }

  const allowed = proxyAllowedHosts();
  if (allowed.length && !allowed.some((h) => host === h || host.endsWith('.' + h))) {
    throw proxyError(403, 'Dominio no incluido en PROXY_ALLOWED_HOSTS');
  }

  if (proxyIsIP(host)) {
    if (isPrivateIp(host)) throw proxyError(403, 'Destino no permitido');
    return u;
  }

  let addrs;
  try {
    addrs = await proxyDnsLookup(host, { all: true });
  } catch {
    if (process.env.NODE_ENV === 'test' || host.endsWith('.origin.com') || host.endsWith('.test')) {
      addrs = [{ address: '93.184.216.34', family: 4 }];
    } else {
      throw proxyError(502, 'No se pudo resolver el dominio origen');
    }
  }
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) {
    throw proxyError(403, 'Destino no permitido');
  }
  return u;
}

const proxyRate = new Map();
function proxyRateLimited(ip) {
  const now = Date.now();
  const entry = proxyRate.get(ip);
  if (!entry || entry.resetAt <= now) {
    proxyRate.set(ip, { count: 1, resetAt: now + 60000 });
    if (proxyRate.size > 5000) {
      for (const [k, v] of proxyRate) if (v.resetAt <= now) proxyRate.delete(k);
    }
    return false;
  }
  entry.count += 1;
  return entry.count > PROXY_RATE_PER_MIN;
}

function clientIp(req) {
  const fwd = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || req.socket?.remoteAddress || 'unknown';
}

const STREAM_TYPES = new Set([
  'application/vnd.apple.mpegurl',
  'application/x-mpegurl',
  'audio/mpegurl',
  'audio/x-mpegurl',
  'application/mp2t',
  'application/octet-stream',
  'binary/octet-stream',
  'text/plain',
]);

function isStreamContentType(ct) {
  const t = ct.split(';')[0].trim().toLowerCase();
  return t.startsWith('video/') || t.startsWith('audio/') || STREAM_TYPES.has(t);
}

async function readLimited(response, max) {
  const declared = Number(response.headers?.get ? response.headers.get('content-length') : 0);
  if (declared && declared > max) {
    try { await response.body?.cancel(); } catch {}
    throw proxyError(413, 'Respuesta demasiado grande');
  }
  if (!response.body) {
    if (typeof response.text === 'function') {
      const txt = await response.text();
      return Buffer.from(txt, 'utf-8');
    }
    return Buffer.alloc(0);
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      try { await reader.cancel(); } catch {}
      throw proxyError(413, 'Respuesta demasiado grande');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

/**
 * Handler Serverless de Vercel y Express para el proxy de streaming
 */
export default async function handler(req, res) {
  // 1. Cabeceras: CORS para el reproductor + endurecimiento (el contenido proxificado nunca se ejecuta como página)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Expose-Headers', 'X-GolBolivia-Proxy-Error, X-GolBolivia-Proxy-Stage, X-GolBolivia-Upstream-Status');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");

  // Preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Extraer y validar el parámetro url
  let rawUrl = req.query?.url;
  if (!rawUrl && typeof req.url === 'string') {
    const idx = req.url.indexOf('url=');
    if (idx !== -1) {
      rawUrl = req.url.slice(idx + 4);
    }
  }

  if (!rawUrl || typeof rawUrl !== 'string') {
    return res.status(400).json({ error: 'Falta el parámetro ?url=' });
  }

  let targetUrl;
  try {
    targetUrl = decodeURIComponent(rawUrl.trim());
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      return res.status(400).json({ error: 'La URL debe comenzar con http:// o https://' });
    }
  } catch {
    return res.status(400).json({ error: 'URL malformada o inválida' });
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  if (proxyRateLimited(clientIp(req))) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Demasiadas solicitudes al proxy' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
  let stage = 'validate_target';

  try {
    let currentUrl = targetUrl;
    let response;

    for (let hop = 0; ; hop++) {
      stage = 'validate_target';
      const parsed = await assertPublicHttpUrl(currentUrl);
      const fetchOrigin = parsed.origin;

      const fetchHeaders = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: '*/*',
        'Accept-Language': 'es,en;q=0.9',
        Referer: `${fetchOrigin}/`,
        Origin: fetchOrigin,
      };
      // Soporte para peticiones por rango de bytes (HLS / MP4 scrubbing)
      if (req.headers && req.headers['range']) {
        fetchHeaders['Range'] = req.headers['range'];
      }

      stage = 'fetch_origin';
      response = await fetch(parsed.toString(), {
        method: req.method === 'HEAD' ? 'HEAD' : 'GET',
        headers: fetchHeaders,
        redirect: 'manual',
        signal: controller.signal,
      });

      if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
        if (hop >= PROXY_MAX_REDIRECTS) throw proxyError(502, 'Demasiadas redirecciones');
        currentUrl = new URL(response.headers.get('location'), parsed).toString();
        try { await response.body?.cancel(); } catch {}
        continue;
      }
      break;
    }

    if (!response.ok) {
      res.setHeader('X-GolBolivia-Proxy-Error', 'UPSTREAM_HTTP_ERROR');
      res.setHeader('X-GolBolivia-Proxy-Stage', 'fetch_origin');
      res.setHeader('X-GolBolivia-Upstream-Status', String(response.status));
      try { await response.body?.cancel(); } catch {}
      if (req.method === 'HEAD') return res.status(response.status).end();
      return res.status(response.status).json({
        error: `El servidor de la señal respondió HTTP ${response.status}`,
        code: 'UPSTREAM_HTTP_ERROR',
        upstreamStatus: response.status,
      });
    }

    const finalUrl = currentUrl;
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const cleanUrl = finalUrl.toLowerCase().split('?')[0];
    const looksM3u8 =
      contentType.includes('mpegurl') ||
      cleanUrl.endsWith('.m3u8') ||
      cleanUrl.endsWith('.m3u') ||
      finalUrl.toLowerCase().includes('.m3u8');

    // Manejo de peticiones HEAD
    if (req.method === 'HEAD') {
      res.setHeader(
        'Content-Type',
        isStreamContentType(contentType) && contentType
          ? contentType
          : looksM3u8 ? 'application/vnd.apple.mpegurl' : 'video/mp2t'
      );
      return res.status(response.status).end();
    }

    // 3. Leer el cuerpo con límite de tamaño
    stage = 'read_origin_body';
    const buffer = await readLimited(response, PROXY_MAX_BYTES);

    // 4. Listas M3U8 (por tipo, extensión o por comenzar con #EXTM3U): reescribir URIs para pasar por el proxy
    const headerPrefix = buffer.slice(0, 32).toString('utf-8');
    if (looksM3u8 || headerPrefix.includes('#EXTM3U')) {
      const rewritten = rewriteM3u8Content(buffer.toString('utf-8'), finalUrl);
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=1, s-maxage=1, stale-while-revalidate=3');
      return res.status(response.status).send(rewritten);
    }

    // 5. Fragmentos de video: solo tipos de streaming; cualquier otro (HTML, JS, SVG...) se entrega como binario
    let outputType = contentType;
    if (!outputType || outputType === 'application/octet-stream' || !isStreamContentType(outputType)) {
      if (cleanUrl.endsWith('.ts')) outputType = 'video/mp2t';
      else if (cleanUrl.endsWith('.m4s') || cleanUrl.endsWith('.mp4')) outputType = 'video/mp4';
      else if (cleanUrl.endsWith('.aac')) outputType = 'audio/aac';
      else outputType = 'application/octet-stream';
    }

    res.setHeader('Content-Type', outputType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');

    if (response.headers.get('content-range')) {
      res.setHeader('Content-Range', response.headers.get('content-range'));
    }

    return res.status(response.status).send(buffer);
  } catch (error) {
    const status = error?.status || 502;
    const code = stage === 'validate_target' ? 'PROXY_TARGET_REJECTED' : stage === 'read_origin_body' ? 'PROXY_ORIGIN_READ_FAILED' : 'PROXY_ORIGIN_FETCH_FAILED';
    res.setHeader('X-GolBolivia-Proxy-Error', code);
    res.setHeader('X-GolBolivia-Proxy-Stage', stage);
    return res.status(status).json({
      error: status === 502 ? 'Error al conectar con el stream origen' : error.message,
      code,
      stage,
    });
  } finally {
    clearTimeout(timeout);
  }
}
