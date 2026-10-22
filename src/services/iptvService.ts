import { authService } from './auth';
import type { IptvChannel, IptvCountryCode } from '../types/iptv';

const CACHE_KEY = 'golbolivia_iptv_sports_cache_v2'; // invalidar catálogo anterior con canales de demostración incorrectos
const FAVORITES_KEY = 'golbolivia_iptv_favorites';
const LAST_CHANNEL_KEY = 'golbolivia_iptv_last_played';

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_TIME_KEY = `${CACHE_KEY}_updated_at`;
let memoryCache: IptvChannel[] | null = null;
let updatedAt = 0;
let pendingRequest: Promise<void> | null = null;
let loadError: string | null = null;

function isChannelList(value: unknown): value is IptvChannel[] {
  return Array.isArray(value) && value.every((channel) => channel &&
    ['id', 'name', 'country', 'countryName', 'group', 'streamUrl'].every((key) => typeof channel[key] === 'string'));
}

export const iptvService = {
  /**
   * Obtiene los canales cacheados de forma síncrona inmediata desde memoria o localStorage.
   * Permite renderizado en 0ms sin pantallas de carga en el frontend.
   */
  getCachedChannelsSync(): IptvChannel[] {
    if (memoryCache && memoryCache.length > 0) return memoryCache;
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (isChannelList(parsed) && parsed.length > 0) {
            memoryCache = parsed;
            updatedAt = Number(localStorage.getItem(CACHE_TIME_KEY)) || 0;
            return parsed;
          }
        }
      } catch {}
    }
    return [];
  },

  /**
   * Obtiene la lista completa de canales IPTV deportivos (vía backend proxy con fallback)
   * Guarda siempre el catálogo completo en la caché antes de filtrar por país o búsqueda,
   * evitando que una primera búsqueda filtrada contamine la caché global.
   */
  async getChannels(params?: { country?: IptvCountryCode; query?: string; forceRefresh?: boolean }): Promise<IptvChannel[]> {
    const { country = 'ALL', query = '', forceRefresh = false } = params || {};

    iptvService.getCachedChannelsSync();
    if (!memoryCache || forceRefresh || Date.now() - updatedAt >= CACHE_TTL_MS) {
      if (!pendingRequest) {
        pendingRequest = (async () => {
          loadError = null;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15000);
          try {
            const url = forceRefresh ? '/api/iptv/sports?refresh=true' : '/api/iptv/sports';
            const res = await fetch(url, {
              signal: controller.signal,
              cache: forceRefresh ? 'no-store' : 'default',
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (!isChannelList(data.channels)) throw new Error('Catálogo inválido');
            memoryCache = data.channels;
            updatedAt = Date.now();
            try {
              localStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
              localStorage.setItem(CACHE_TIME_KEY, String(updatedAt));
            } catch {}
          } catch {
            loadError = 'No pudimos actualizar los canales. Comprueba tu conexión y vuelve a intentarlo.';
            if (!memoryCache) throw new Error(loadError);
          } finally {
            clearTimeout(timeout);
          }
        })();
      }
      try {
        await pendingRequest;
      } finally {
        pendingRequest = null;
      }
    }

    const allChannels = memoryCache || [];
    const favorites = iptvService.getFavoriteChannelIds();

    // 2. Mapear con estado de favoritos
    let filtered = allChannels.map((c) => ({
      ...c,
      isFavorite: favorites.includes(c.id),
    }));

    // 3. Aplicar filtro de país en cliente DESPUÉS de guardar el catálogo completo
    if (country && country !== 'ALL') {
      filtered = filtered.filter((c) => c.country === country);
    }

    // 4. Aplicar búsqueda en cliente DESPUÉS de guardar el catálogo completo
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
   * Limpia la memoria y el almacenamiento local de caché IPTV (útil para pruebas y recarga manual)
   */
  clearCache(): void {
    memoryCache = null;
    updatedAt = 0;
    loadError = null;
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIME_KEY);
    } catch {}
  },

  getLoadError(): string | null {
    return loadError;
  },

  /** Obtiene la caché del catálogo completo, antes de aplicar filtros. */
  getMemoryCache(): IptvChannel[] | null {
    return memoryCache;
  },

  /**
   * Establece manualmente la caché en memoria (para pruebas unitarias)
   */
  setMemoryCache(channels: IptvChannel[] | null): void {
    memoryCache = channels;
    updatedAt = channels ? Date.now() : 0;
  },

  /**
   * Obtiene los IDs de canales favoritos guardados por el usuario
   */
  getFavoriteChannelIds(): string[] {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
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

  /**
   * Obtiene la lista de canales IPTV personalizados creados desde el dashboard
   */
  async getCustomChannels(): Promise<IptvChannel[]> {
    try {
      const res = await fetch('/api/iptv/custom');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return Array.isArray(data.channels) ? data.channels : [];
    } catch (err) {
      console.warn('[iptvService] Error al obtener canales personalizados:', err);
      return [];
    }
  },

  /**
   * Agrega un nuevo canal IPTV personalizado desde el dashboard
   */
  async addCustomChannel(channelData: Partial<IptvChannel> & { editingId?: string; editingStreamUrl?: string }): Promise<IptvChannel> {
    const res = await fetch('/api/iptv/custom', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authService.getToken() || ''}`,
      },
      body: JSON.stringify(channelData),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Error ${res.status} al guardar canal`);
    }
    const data = await res.json();
    iptvService.clearCache(); // Invalidar caché para forzar recarga del nuevo canal
    return data.channel;
  },

  /**
   * Elimina un canal IPTV personalizado
   */
  async deleteCustomChannel(id: string): Promise<boolean> {
    const res = await fetch(`/api/iptv/custom/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authService.getToken() || ''}` },
    });
    if (!res.ok) return false;
    iptvService.clearCache();
    return true;
  },

  /**
   * Prueba en tiempo real la conectividad y latencia de una señal .m3u8
   */
  async probeStreamUrl(streamUrl: string): Promise<{ success: boolean; reachable: boolean; latencyMs?: number; error?: string }> {
    try {
      const res = await fetch('/api/iptv/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authService.getToken() || ''}` },
        body: JSON.stringify({ streamUrl }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, reachable: false, error: err?.message || 'Error de red al probar señal' };
    }
  },
};
