// GolBolivia Live — Módulo IPTV Loader + Reproductor HLS
// Permite combinar canales destacados propios con la grilla de iptv-org
// y reproducir flujos .m3u8 sin recargas de página.

let hlsInstance = null;
let listaCanalesGlobal = [];

// 1. Canales personalizados de GolBolivia mezclados con la lista de iptv-org
const canalesDestacados = [
  {
    nombre: "Señal Principal - Fútbol Boliviano",
    logo: "https://golbolivialive-beta.vercel.app/favicon.svg",
    categoria: "Deportes",
    url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
  },
  {
    nombre: "Claro Sports Latam HD",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Claro_Sports_logo.svg/320px-Claro_Sports_logo.svg.png",
    categoria: "Deportes",
    url: "https://live-clarosports-linear.amagi.tv/playlist.m3u8"
  }
];

// Helper: Pasar por proxy CORS si la URL es http:// o si el navegador bloquea contenido mixto
function normalizarUrlStream(url) {
  if (!url) return '';
  if (url.startsWith('http://') && window.location.protocol === 'https:') {
    return `/api/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

// 2. Función para descargar y convertir la lista M3U de iptv-org
async function cargarCanalesIPTV(urlM3u = 'https://iptv-org.github.io/iptv/countries/bo.m3u') {
  try {
    const res = await fetch(urlM3u);
    const texto = await res.text();
    const lineas = texto.split('\n');
    const canalesExtraidos = [];
    let actual = null;

    for (let rawLine of lineas) {
      let linea = rawLine.trim();
      if (linea.startsWith('#EXTINF:')) {
        const logo = linea.match(/tvg-logo="([^"]*)"/)?.[1] || '';
        const categoria = linea.match(/group-title="([^"]*)"/)?.[1] || 'TV Abierta';
        const nombre = linea.split(',').pop().trim();
        actual = { nombre, logo, categoria, url: '' };
      } else if (linea.startsWith('http') && actual) {
        actual.url = linea;
        canalesExtraidos.push(actual);
        actual = null;
      }
    }

    // Unir canales propios destacados con los de la lista M3U
    listaCanalesGlobal = [...canalesDestacados, ...canalesExtraidos];
    renderizarGrilla(listaCanalesGlobal);
  } catch (err) {
    console.error("Error cargando M3U:", err);
    listaCanalesGlobal = [...canalesDestacados];
    renderizarGrilla(listaCanalesGlobal);
  }
}

// 3. Función para reproducir el flujo .m3u8 al hacer clic
function reproducirCanal(url, nombre) {
  const video = document.getElementById('player-golbolivia');
  const titulo = document.getElementById('titulo-canal-activo');
  if (titulo) titulo.textContent = `En vivo: ${nombre}`;

  if (!video) return;

  const streamUrl = normalizarUrlStream(url);

  if (window.Hls && window.Hls.isSupported()) {
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
    hlsInstance = new window.Hls({
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 60,
      manifestLoadingTimeOut: 4000,
      manifestLoadingMaxRetry: 1,
      levelLoadingTimeOut: 4500,
      fragLoadingTimeOut: 6000,
      fragLoadingMaxRetry: 2,
    });
    hlsInstance.loadSource(streamUrl);
    hlsInstance.attachMedia(video);
    hlsInstance.on(window.Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => console.log("Esperando interacción del usuario para reproducir"));
    });
    hlsInstance.on(window.Hls.Events.ERROR, (_, data) => {
      const isManifestError =
        data?.details === window.Hls.ErrorDetails?.MANIFEST_LOAD_ERROR ||
        data?.details === window.Hls.ErrorDetails?.MANIFEST_LOAD_TIMEOUT ||
        data?.details === window.Hls.ErrorDetails?.MANIFEST_PARSING_ERROR;

      if (isManifestError && !streamUrl.includes('/api/proxy')) {
        const proxied = `/api/proxy?url=${encodeURIComponent(url)}`;
        hlsInstance.loadSource(proxied);
        hlsInstance.startLoad();
        return;
      }

      if (data?.fatal && data.type === window.Hls.ErrorTypes.NETWORK_ERROR) {
        if (!streamUrl.includes('/api/proxy')) {
          const proxied = `/api/proxy?url=${encodeURIComponent(url)}`;
          hlsInstance.loadSource(proxied);
          hlsInstance.startLoad();
        }
      }
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    // Soporte nativo para Safari / iOS
    video.src = streamUrl;
    video.play().catch(() => {});
  }
}

// 4. Pintar los botones/tarjetas en la grilla web
function renderizarGrilla(canales) {
  const contenedor = document.getElementById('grilla-canales');
  if (!contenedor) return;
  contenedor.innerHTML = '';

  canales.forEach(canal => {
    if (!canal.url || !canal.url.startsWith('http')) return; // Ignorar vacíos

    const card = document.createElement('div');
    card.className = 'canal-card';
    card.innerHTML = `
      <img src="${canal.logo || 'https://via.placeholder.com/60?text=TV'}" alt="${canal.nombre}" onerror="this.src='https://via.placeholder.com/60?text=TV'" />
      <div>
        <h4>${canal.nombre}</h4>
        <span>${canal.categoria}</span>
      </div>
    `;
    card.onclick = () => reproducirCanal(canal.url, canal.nombre);
    contenedor.appendChild(card);
  });
}

// Iniciar al cargar el DOM si los contenedores están presentes
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // Solo inicializar si existe la grilla en el DOM
    if (document.getElementById('grilla-canales')) {
      cargarCanalesIPTV('https://iptv-org.github.io/iptv/countries/bo.m3u');

      // Filtro de búsqueda rápido
      document.getElementById('buscador-canales')?.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const filtrados = listaCanalesGlobal.filter(c => c.nombre.toLowerCase().includes(q));
        renderizarGrilla(filtrados);
      });
    }
  });
}
