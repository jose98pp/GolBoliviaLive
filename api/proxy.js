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

/**
 * Handler Serverless de Vercel y Express para el proxy de streaming
 */
export default async function handler(req, res) {
  // 1. Cabeceras universales para permitir reproducción sin bloqueo CORS en GolBolivia LIVE
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

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

  try {
    let fetchOrigin = '';
    try {
      fetchOrigin = new URL(targetUrl).origin;
    } catch {}

    const fetchHeaders = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: '*/*',
      'Accept-Language': 'es,en;q=0.9',
      ...(fetchOrigin && {
        Referer: `${fetchOrigin}/`,
        Origin: fetchOrigin,
      }),
    };

    // Soporte para peticiones por rango de bytes (HLS / MP4 scrubbing)
    if (req.headers && req.headers['range']) {
      fetchHeaders['Range'] = req.headers['range'];
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(targetUrl, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: fetchHeaders,
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const cleanUrl = targetUrl.toLowerCase().split('?')[0];
    let isM3u8 =
      contentType.includes('mpegurl') ||
      contentType.includes('x-mpegurl') ||
      cleanUrl.endsWith('.m3u8') ||
      cleanUrl.endsWith('.m3u') ||
      targetUrl.toLowerCase().includes('.m3u8');

    // Manejo de peticiones HEAD
    if (req.method === 'HEAD') {
      res.setHeader(
        'Content-Type',
        contentType || (isM3u8 ? 'application/vnd.apple.mpegurl' : 'video/mp2t')
      );
      return res.status(response.status).end();
    }

    // 3. Si es lista de reproducción M3U8, reescribir las rutas relativas o HTTP internas
    if (isM3u8) {
      const text = await response.text();
      const finalBaseUrl = response.url || targetUrl;
      const rewritten = rewriteM3u8Content(text, finalBaseUrl);

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=1, s-maxage=1, stale-while-revalidate=3');
      return res.status(response.status).send(rewritten);
    }

    // 4. Si el contenido es genérico pero comienza con #EXTM3U, tratar como lista M3U8
    const rawBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(rawBuffer);

    // Revisar los primeros 32 bytes en busca de #EXTM3U
    const headerPrefix = buffer.slice(0, 32).toString('utf-8');
    if (headerPrefix.includes('#EXTM3U')) {
      const text = buffer.toString('utf-8');
      const finalBaseUrl = response.url || targetUrl;
      const rewritten = rewriteM3u8Content(text, finalBaseUrl);

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=1, s-maxage=1, stale-while-revalidate=3');
      return res.status(response.status).send(rewritten);
    }

    // 5. Si es fragmento de video (.ts, .m4s, etc.), transmitir los bytes directamente con caché Edge
    let outputType = contentType;
    if (!outputType || outputType === 'application/octet-stream') {
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
    return res.status(502).json({
      error: 'Error al conectar con el stream origen',
      message: error?.message || 'Error de conexión / Timeout',
      url: targetUrl,
    });
  }
}
