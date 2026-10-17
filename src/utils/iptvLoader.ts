// ── IPTV Loader & HLS Player Module ──
// Soporte integrado para listas M3U (bo.m3u & sports.m3u), proxy CORS y reproductor HLS.js

import type { IptvChannel } from '../types/iptv';
import { getProxiedStreamUrl } from './streamUtils';

export interface DestacadoChannel {
  nombre: string;
  logo: string;
  categoria: string;
  url: string;
}

// 1. Canales destacados oficiales de GolBolivia Live
export const canalesDestacados: DestacadoChannel[] = [
  {
    nombre: 'Señal Principal - Fútbol Boliviano',
    logo: 'https://golbolivialive-beta.vercel.app/favicon.svg',
    categoria: 'Deportes',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    nombre: 'Claro Sports Latam HD',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Claro_Sports_logo.svg/320px-Claro_Sports_logo.svg.png',
    categoria: 'Deportes',
    url: 'https://live-clarosports-linear.amagi.tv/playlist.m3u8',
  },
];

let globalHlsInstance: any = null;
export let listaCanalesGlobal: Array<{ nombre: string; logo: string; categoria: string; url: string }> = [];

// 2. Función para descargar y convertir la lista M3U de iptv-org
export async function cargarCanalesIPTV(
  urlM3u: string = 'https://iptv-org.github.io/iptv/countries/bo.m3u'
): Promise<Array<{ nombre: string; logo: string; categoria: string; url: string }>> {
  try {
    const res = await fetch(urlM3u);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const texto = await res.text();
    const lineas = texto.split('\n');
    const canalesExtraidos: Array<{ nombre: string; logo: string; categoria: string; url: string }> = [];
    let actual: { nombre: string; logo: string; categoria: string; url: string } | null = null;

    for (let rawLine of lineas) {
      const linea = rawLine.trim();
      if (linea.startsWith('#EXTINF:')) {
        const logo = linea.match(/tvg-logo="([^"]*)"/)?.[1] || '';
        const categoria = linea.match(/group-title="([^"]*)"/)?.[1] || 'TV Abierta';
        const nombre = linea.split(',').pop()?.trim() || 'Canal';
        actual = { nombre, logo, categoria, url: '' };
      } else if (linea.startsWith('http') && actual) {
        actual.url = linea;
        canalesExtraidos.push(actual);
        actual = null;
      }
    }

    // Unir canales destacados propios con los de la lista M3U
    listaCanalesGlobal = [...canalesDestacados, ...canalesExtraidos];
    renderizarGrilla(listaCanalesGlobal);
    return listaCanalesGlobal;
  } catch (err) {
    console.error('[IPTV Loader] Error cargando M3U:', err);
    listaCanalesGlobal = [...canalesDestacados];
    renderizarGrilla(listaCanalesGlobal);
    return listaCanalesGlobal;
  }
}

// 3. Función para reproducir el flujo .m3u8 al hacer clic con soporte HLS / Proxy / Safari
export function reproducirCanal(url: string, nombre: string): void {
  if (typeof document === 'undefined') return;

  const video = document.getElementById('player-golbolivia') as HTMLVideoElement | null;
  const titulo = document.getElementById('titulo-canal-activo');
  if (titulo) {
    titulo.textContent = `En vivo: ${nombre}`;
  }

  if (!video) return;

  // Evitar bloqueos de contenido mixto en HTTPS pasando enlaces http por el proxy serverless
  const streamUrl = getProxiedStreamUrl(url);

  const HlsClass = (window as any).Hls;
  if (HlsClass && HlsClass.isSupported()) {
    if (globalHlsInstance) {
      globalHlsInstance.destroy();
      globalHlsInstance = null;
    }
    const hls = new HlsClass({
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 60,
      manifestLoadingTimeOut: 4000,
      manifestLoadingMaxRetry: 1,
      levelLoadingTimeOut: 4500,
      fragLoadingTimeOut: 6000,
      fragLoadingMaxRetry: 2,
    });
    globalHlsInstance = hls;

    hls.loadSource(streamUrl);
    hls.attachMedia(video);
    hls.on(HlsClass.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {
        console.log('[IPTV Loader] Esperando interacción del usuario para reproducir');
      });
    });

    hls.on(HlsClass.Events.ERROR, (_: any, data: any) => {
      const isManifestError =
        data?.details === HlsClass.ErrorDetails?.MANIFEST_LOAD_ERROR ||
        data?.details === HlsClass.ErrorDetails?.MANIFEST_LOAD_TIMEOUT ||
        data?.details === HlsClass.ErrorDetails?.MANIFEST_PARSING_ERROR;

      if (isManifestError && !streamUrl.includes('/api/proxy')) {
        const proxied = getProxiedStreamUrl(url, true);
        hls.loadSource(proxied);
        hls.startLoad();
        return;
      }

      if (data?.fatal) {
        switch (data.type) {
          case HlsClass.ErrorTypes.NETWORK_ERROR:
            // Reintentar a través del proxy CORS serverless de Vercel
            if (!streamUrl.includes('/api/proxy')) {
              const proxied = getProxiedStreamUrl(url, true);
              hls.loadSource(proxied);
              hls.startLoad();
            } else {
              hls.startLoad();
            }
            break;
          case HlsClass.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError();
            break;
          default:
            hls.destroy();
            break;
        }
      }
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    // Soporte nativo para Safari / iOS / macOS
    video.src = streamUrl;
    video.play().catch(() => {});
  }
}

// 4. Pintar los botones/tarjetas en la grilla DOM
export function renderizarGrilla(canales: Array<{ nombre: string; logo: string; categoria: string; url: string }>): void {
  if (typeof document === 'undefined') return;
  const contenedor = document.getElementById('grilla-canales');
  if (!contenedor) return;

  contenedor.innerHTML = '';

  canales.forEach((canal) => {
    if (!canal.url || !canal.url.startsWith('http')) return;

    const card = document.createElement('div');
    card.className =
      'canal-card group relative p-3.5 rounded-2xl border border-slate-800/80 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-900 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden shadow-sm';
    card.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-xl bg-slate-950/80 border border-slate-800/80 p-1 flex items-center justify-center shrink-0 overflow-hidden">
          <img
            src="${canal.logo || 'https://via.placeholder.com/60?text=TV'}"
            alt="${canal.nombre}"
            onerror="this.src='https://via.placeholder.com/60?text=TV'"
            class="w-full h-full object-contain"
          />
        </div>
        <div class="min-w-0 flex-1">
          <h4 class="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors truncate">
            ${canal.nombre}
          </h4>
          <span class="text-xs text-slate-400">${canal.categoria || 'TV Abierta'}</span>
        </div>
      </div>
    `;
    card.onclick = () => reproducirCanal(canal.url, canal.nombre);
    contenedor.appendChild(card);
  });
}
