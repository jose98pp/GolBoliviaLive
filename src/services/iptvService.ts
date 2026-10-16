import type { IptvChannel, IptvCountryCode } from '../types/iptv';

const CACHE_KEY = 'golbolivia_iptv_sports_cache';
const FAVORITES_KEY = 'golbolivia_iptv_favorites';
const LAST_CHANNEL_KEY = 'golbolivia_iptv_last_played';

let memoryCache: IptvChannel[] | null = null;

export const iptvService = {
  /**
   * Obtiene la lista completa de canales IPTV deportivos (vía backend proxy con fallback)
   */
  async getChannels(params?: { country?: IptvCountryCode; query?: string; forceRefresh?: boolean }): Promise<IptvChannel[]> {
    const { country = 'ALL', query = '', forceRefresh = false } = params || {};

    if (!memoryCache || forceRefresh) {
      try {
        const queryParams = new URLSearchParams();
        if (country && country !== 'ALL') queryParams.append('country', country);
        if (query) queryParams.append('q', query);

        const url = `/api/iptv/sports?${queryParams.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();

        if (Array.isArray(data.channels) && data.channels.length > 0) {
          memoryCache = data.channels;
          try {
            // Guardar hasta 100 canales en localStorage para inicio offline instantáneo
            localStorage.setItem(CACHE_KEY, JSON.stringify(data.channels.slice(0, 100)));
          } catch {}
        }
      } catch (err) {
        console.warn('[iptvService] Error al obtener canales remotos, cargando caché local:', err);
        // Intentar leer caché local si la red falla
        if (!memoryCache) {
          try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (raw) memoryCache = JSON.parse(raw);
          } catch {}
        }
      }
    }

    const allChannels = memoryCache || [];
    const favorites = iptvService.getFavoriteChannelIds();

    // Mapear con estado de favoritos
    let filtered = allChannels.map((c) => ({
      ...c,
      isFavorite: favorites.includes(c.id),
    }));

    // Aplicar filtro de país en cliente
    if (country && country !== 'ALL') {
      filtered = filtered.filter((c) => c.country === country);
    }

    // Aplicar búsqueda en cliente
    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      filtered = filtered.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.countryName.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q)
      );
    }

    return filtered;
  },

  /**
   * Obtiene los IDs de canales favoritos guardados por el usuario
   */
  getFavoriteChannelIds(): string[] {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Alterna un canal como favorito
   */
  toggleFavorite(channelId: string): boolean {
    try {
      const current = iptvService.getFavoriteChannelIds();
      const exists = current.includes(channelId);
      const updated = exists ? current.filter((id) => id !== channelId) : [...current, channelId];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      return !exists;
    } catch {
      return false;
    }
  },

  /**
   * Guarda el último canal reproducido para reanudación rápida
   */
  saveLastPlayed(channel: IptvChannel): void {
    try {
      localStorage.setItem(LAST_CHANNEL_KEY, JSON.stringify(channel));
    } catch {}
  },

  /**
   * Obtiene el último canal reproducido
   */
  getLastPlayed(): IptvChannel | null {
    try {
      const raw = localStorage.getItem(LAST_CHANNEL_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
};
