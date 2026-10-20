import type { IptvChannel } from '../types/iptv';

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
