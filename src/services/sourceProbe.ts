import { getProxiedStreamUrl, normalizeMatchIptvUrl } from '../utils/streamUtils';
import type { EventSource } from '../types/football';

export async function probeHlsSource(source: EventSource) {
  if (!normalizeMatchIptvUrl(source.url)) return { ok: false, status: 0, message: 'Introduce una URL HLS compatible antes de comprobar.' };
  const started = Date.now();
  const budget = source.waitForBroadcast ? 30000 : 12000;
  let status = 0;
  let proxy = false;
  for (let attempt = 0; attempt < (source.waitForBroadcast ? 5 : 1); attempt++) {
    const remaining = budget - (Date.now() - started);
    if (remaining <= 0) break;
    try {
      let response: Response;
      try { response = await fetch(getProxiedStreamUrl(source.url, proxy), { cache: 'no-store', signal: AbortSignal.timeout(Math.min(12000, remaining)) }); }
      catch {
        if (proxy || getProxiedStreamUrl(source.url, true) === getProxiedStreamUrl(source.url)) throw new Error('No se pudo conectar con la fuente.');
        proxy = true;
        const left = budget - (Date.now() - started);
        if (left <= 0) break;
        response = await fetch(getProxiedStreamUrl(source.url, true), { cache: 'no-store', signal: AbortSignal.timeout(Math.min(12000, left)) });
      }
      status = response.status;
      if (response.ok) {
        const body = await response.text();
        if (!body.trimStart().startsWith('#EXTM3U')) return { ok: false, status, message: 'El enlace responde, pero no contiene un manifiesto HLS. Puede ser una página HTML o una ruta incorrecta.' };
        return { ok: true, status, message: `Manifiesto HLS disponible (${Date.now() - started} ms). La reproducción y los segmentos se comprueban en el reproductor.` };
      }
      if (!source.waitForBroadcast || ![404, 503].includes(status)) break;
    } catch { if (!source.waitForBroadcast) return { ok: false, status, message: 'No se pudo consultar la señal: revisa conexión, CORS o el túnel.' }; }
    if (attempt < 4) await new Promise(resolve => setTimeout(resolve, Math.min([1500, 2500, 4000, 6000][attempt], Math.max(0, budget - (Date.now() - started)))));
  }
  return { ok: false, status, message: status === 404 ? 'HTTP 404: revisa que OBS publique, que el path de MediaMTX coincida y que el túnel apunte al puerto HLS. Esperar no corrige una ruta inexistente.' : status === 401 || status === 403 ? `HTTP ${status}: el servidor rechazó el acceso a esta señal.` : `No llegó un manifiesto HLS reproducible dentro del tiempo de comprobación${status ? ` (HTTP ${status})` : ''}.` };
}
