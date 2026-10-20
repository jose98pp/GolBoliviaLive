import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import {
  Tv,
  Search,
  Cast,
  Play,
  Star,
  RefreshCw,
  X,
  Radio,
  ExternalLink,
  Flame,
  Check,
} from 'lucide-react';
import type { IptvChannel, IptvCountryCode } from '../types/iptv';
import { IPTV_COUNTRIES } from '../types/iptv';
import { iptvService } from '../services/iptvService';

export interface IptvChannelsViewProps {
  onSelectChannel: (channel: IptvChannel) => void;
  activeStreamUrl?: string;
  onOpenCast?: () => void;
}

export const IptvChannelsView: React.FC<IptvChannelsViewProps> = ({
  onSelectChannel,
  activeStreamUrl,
  onOpenCast,
}) => {
  const [channels, setChannels] = useState<IptvChannel[]>(() => iptvService.getCachedChannelsSync());
  const [loading, setLoading] = useState<boolean>(() => iptvService.getCachedChannelsSync().length === 0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recentChannelIds, setRecentChannelIds] = useState<string[]>(() => {
    try {
      const ids = JSON.parse(localStorage.getItem('golbolivia_iptv_recent_ids') || '[]');
      return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
    } catch { return []; }
  });
  const [showRecent, setShowRecent] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<IptvCountryCode>('ALL');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => iptvService.getFavoriteChannelIds());
  const deferredQuery = useDeferredValue(searchQuery);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Cargar canales iniciales con patrón SWR (Stale-While-Revalidate)
  const loadChannels = async (force = false) => {
    if (force) {
      setIsRefreshing(true);
    } else if (channels.length === 0) {
      setLoading(true);
    }

    setLoadError(null);
    try {
      const data = await iptvService.getChannels({ forceRefresh: force });
      setChannels(data);
      setLoadError(iptvService.getLoadError());
      setFavoriteIds(iptvService.getFavoriteChannelIds());
    } catch (err) {
      setLoadError('No pudimos cargar los canales. Comprueba tu conexión y vuelve a intentarlo.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadChannels();
  }, []);

  const handleToggleFavorite = (e: React.MouseEvent, channelId: string) => {
    e.stopPropagation();
    const isNowFav = iptvService.toggleFavorite(channelId);
    setFavoriteIds((prev) =>
      isNowFav ? [...prev, channelId] : prev.filter((id) => id !== channelId)
    );
  };

  const selectChannel = (channel: IptvChannel) => {
    setRecentChannelIds((prev) => {
      const next = [channel.id, ...prev.filter((id) => id !== channel.id)].slice(0, 12);
      try { localStorage.setItem('golbolivia_iptv_recent_ids', JSON.stringify(next)); } catch {}
      return next;
    });
    onSelectChannel(channel);
  };

  // Filtrado reactivo
  const filteredChannels = useMemo(() => {
    let result = channels;

    if (showRecent) {
      result = result.filter((c) => recentChannelIds.includes(c.id));
    } else if (showOnlyFavorites) {
      result = result.filter((c) => favoriteIds.includes(c.id));
    } else if (selectedCountry !== 'ALL') {
      result = result.filter((c) => c.country === selectedCountry);
    }

    if (deferredQuery.trim()) {
      const q = deferredQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.countryName.toLowerCase().includes(q) ||
          c.group.toLowerCase().includes(q)
      );
    }

    return result;
  }, [channels, selectedCountry, deferredQuery, showOnlyFavorites, showRecent, recentChannelIds, favoriteIds]);

  return (
    <div className="w-full space-y-6 py-2">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-950/90 border border-slate-800/80 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Tv className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Canales Deportivos IPTV en Vivo
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Transmisiones deportivas en vivo. Selecciona cualquier canal para verlo en el reproductor principal con soporte para Smart TV y pantalla completa.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenCast && (
            <button
              onClick={onOpenCast}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700/80 transition-colors cursor-pointer"
              title="Transmitir a Google Chromecast o Smart TV"
            >
              <Cast className="w-3.5 h-3.5 text-amber-400" />
              <span>Google Cast</span>
            </button>
          )}

          <button
            onClick={() => loadChannels(true)}
            disabled={isRefreshing || loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-xl border border-slate-700/60 transition-colors cursor-pointer disabled:opacity-50 min-h-11 focus-visible:outline-2 focus-visible:outline-amber-300"
            aria-label="Actualizar lista de canales"
            title="Recargar lista de canales"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin motion-reduce:animate-none text-amber-400' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Search & Country Tabs */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              id="buscador-canales"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Buscar canales por nombre, país o categoría"
              placeholder="Buscar canal o partido..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Borrar búsqueda"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button type="button" onClick={() => { setShowRecent((v) => !v); setShowOnlyFavorites(false); }} aria-pressed={showRecent} className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${showRecent ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-900 border-slate-800 text-slate-300'}`}>Recientes ({recentChannelIds.length})</button>
          {/* Favorites Filter Button */}
          <button
            aria-pressed={showOnlyFavorites}
            onClick={() => { setShowOnlyFavorites((prev) => !prev); setShowRecent(false); }}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              showOnlyFavorites
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-slate-950 text-slate-950' : 'text-amber-400'}`} />
            <span>Favoritos ({favoriteIds.length})</span>
          </button>
        </div>

        {/* Horizontal Country Tabs */}
        {!showOnlyFavorites && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
            {IPTV_COUNTRIES.map((country) => {
              const isActive = selectedCountry === country.code;
              return (
                <button
                  key={country.code}
                  onClick={() => { setSelectedCountry(country.code); setShowRecent(false); }}
                  aria-pressed={isActive}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-amber-300 font-semibold border border-amber-500/40 shadow-sm'
                      : 'bg-slate-900/70 text-slate-400 hover:text-slate-200 border border-slate-800/80 hover:bg-slate-800/60'
                  }`}
                >
                  <span className="text-xs">{country.flag}</span>
                  <span>{country.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {loadError && (
        <div role="alert" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-slate-900 p-4 text-sm text-slate-200">
          <p>{loadError}{channels.length > 0 ? ' Mostramos la última lista guardada.' : ''}</p>
          <button type="button" onClick={() => loadChannels(true)} disabled={isRefreshing || loading} className="shrink-0 min-h-11 px-4 rounded-lg bg-amber-500 text-slate-950 font-semibold disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-amber-300">Reintentar</button>
        </div>
      )}
      <p role="status" aria-live="polite" className="text-xs text-slate-400">
        {loading ? 'Cargando canales…' : isRefreshing ? 'Actualizando sin interrumpir tu selección…' : `${filteredChannels.length} ${filteredChannels.length === 1 ? 'canal disponible' : 'canales disponibles'} en esta lista`}
      </p>
      {/* Grid of Channels */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin motion-reduce:animate-none text-amber-500" />
          <p className="text-sm font-medium">Sincronizando canales deportivos IPTV...</p>
        </div>
      ) : filteredChannels.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-3">
          <Radio className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">
            {loadError && channels.length === 0 ? 'La lista no está disponible' : showRecent ? 'Aún no has sintonizado canales' : showOnlyFavorites
              ? 'No tienes canales guardados como favoritos aún'
              : 'No se encontraron canales con los filtros actuales'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {showOnlyFavorites
              ? 'Toca la estrella en cualquier canal deportivo para guardarlo en tu lista de acceso rápido.'
              : 'Prueba con otro término de búsqueda o selecciona "Todos los Deportes".'}
          </p>
          {(searchQuery || selectedCountry !== 'ALL' || showOnlyFavorites || showRecent) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCountry('ALL');
                setShowOnlyFavorites(false);
                setShowRecent(false);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Restablecer filtros
            </button>
          )}
        </div>
      ) : (
        <div id="grilla-canales" className="grid-canales grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredChannels.map((channel) => {
            const isPlaying = activeStreamUrl === channel.streamUrl;
            const isFav = favoriteIds.includes(channel.id);

            return (
              <div
                key={channel.id}
                onClick={() => selectChannel(channel)}
                className={`canal-card group relative p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden ${
                  isPlaying
                    ? 'bg-amber-500/10 border-amber-500/80 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/50'
                    : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                {/* Active Indicator Top Bar */}
                {isPlaying && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-300" />
                )}

                <div className="space-y-3">
                  {/* Top row: Logo + Favorite Button */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-950/80 border border-slate-800/80 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                      {channel.logo ? (
                        <img
                          src={channel.logo}
                          loading="lazy"
                          decoding="async"
                          alt={channel.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/favicon.svg';
                          }}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Tv className="w-5 h-5 text-slate-600" />
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleToggleFavorite(e, channel.id)}
                        className={`p-2.5 min-h-11 min-w-11 flex items-center justify-center focus-visible:outline-2 focus-visible:outline-amber-300 rounded-lg transition-colors cursor-pointer ${
                          isFav
                            ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                            : 'text-slate-600 hover:text-slate-400 hover:bg-slate-800/50'
                        }`}
                        aria-pressed={isFav}
                        aria-label={`${isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}: ${channel.name}`}
                        title={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                      >
                        <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Channel info without static pills (Zero-Pill design) */}
                  <div>
                    <h4 className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                      {channel.name}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                      <span>{channel.countryName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-500">{channel.resolution || 'HD'}</span>
                      {channel.isCustom && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-400 font-semibold">Oficial</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Row */}
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {isPlaying ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        <span>En Reproducción</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        {channel.isCustom ? (
                          <span className="text-amber-400/90 font-medium">Señal Verificada</span>
                        ) : (
                          <span>En Vivo</span>
                        )}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      selectChannel(channel);
                    }}
                    aria-label={`Sintonizar ${channel.name}`}
                    className={`flex items-center gap-1 min-h-11 px-3 py-2 focus-visible:outline-2 focus-visible:outline-amber-300 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isPlaying
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-800 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-300'
                    }`}
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{isPlaying ? 'Sintonizado' : 'Sintonizar'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
