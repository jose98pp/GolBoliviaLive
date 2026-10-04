/**
 * Latency & Health Verification Service for GolBolivia Live Streams
 * Performs HTTP HEAD (with partial GET fallback) to verify MediaMTX or CDN availability
 * before triggering source switches.
 */

export interface LatencyTestResult {
  ok: boolean;
  latencyMs: number;
  httpStatus: number;
  quality: 'ultra-low' | 'good' | 'high' | 'offline';
  error?: string;
  checkedAt: number;
  methodUsed: 'HEAD' | 'GET-RANGE';
}

export async function verifyStreamLatency(
  rawUrl: string,
  timeoutMs: number = 4000
): Promise<LatencyTestResult> {
  const url = (rawUrl || '').trim();
  const now = Date.now();

  if (!url || url.length < 8) {
    return {
      ok: false,
      latencyMs: 0,
      httpStatus: 0,
      quality: 'offline',
      error: 'URL .m3u8 no configurada o vacía',
      checkedAt: now,
      methodUsed: 'HEAD',
    };
  }

  const startTime = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let methodUsed: 'HEAD' | 'GET-RANGE' = 'HEAD';
  let response: Response | null = null;
  let errorMsg: string | undefined;

  try {
    // 1. Primary check: HTTP HEAD method to verify live M3U8 playlist without downloading video chunks
    response = await fetch(url, {
      method: 'HEAD',
      mode: 'cors',
      cache: 'no-cache',
      signal: controller.signal,
    });
  } catch (headErr: any) {
    // 2. Secondary fallback: Some CDNs or MediaMTX endpoints reject HEAD or CORS on HEAD; attempt partial GET
    try {
      methodUsed = 'GET-RANGE';
      response = await fetch(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-128' },
        mode: 'cors',
        cache: 'no-cache',
        signal: controller.signal,
      });
    } catch (fallbackErr: any) {
      if (headErr?.name === 'AbortError' || fallbackErr?.name === 'AbortError') {
        errorMsg = `Tiempo de espera agotado (> ${timeoutMs}ms). Servidor MediaMTX o CDN no responde.`;
      } else {
        errorMsg =
          fallbackErr?.message ||
          headErr?.message ||
          'Error de conexión o bloqueo CORS en servidor MediaMTX/CDN.';
      }
    }
  } finally {
    clearTimeout(timeoutId);
  }

  const latencyMs = Math.max(1, Math.round(performance.now() - startTime));

  if (response && (response.ok || (response.status >= 200 && response.status < 400))) {
    let quality: LatencyTestResult['quality'] = 'good';
    if (latencyMs < 140) quality = 'ultra-low';
    else if (latencyMs > 380) quality = 'high';

    return {
      ok: true,
      latencyMs,
      httpStatus: response.status,
      quality,
      checkedAt: Date.now(),
      methodUsed,
    };
  }

  const status = response ? response.status : 0;
  return {
    ok: false,
    latencyMs,
    httpStatus: status,
    quality: 'offline',
    error:
      errorMsg ||
      `Servidor respondió con código HTTP ${status} (No disponible o no encontrado).`,
    checkedAt: Date.now(),
    methodUsed,
  };
}
