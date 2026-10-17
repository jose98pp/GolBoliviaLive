import React, { useState, useEffect } from 'react';
import {
  Tv,
  Plus,
  Trash2,
  Play,
  Check,
  AlertCircle,
  RefreshCw,
  Activity,
  Globe,
  Radio,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import type { IptvChannel, IptvCountryCode } from '../types/iptv';
import { IPTV_COUNTRIES } from '../types/iptv';
import { iptvService } from '../services/iptvService';

interface IptvChannelsManagerProps {
  onSetMatchStreamUrl?: (streamUrl: string, channelName: string) => void;
  activeMatchStreamUrl?: string;
}

export const IptvChannelsManager: React.FC<IptvChannelsManagerProps> = ({
  onSetMatchStreamUrl,
  activeMatchStreamUrl,
}) => {
  const [channels, setChannels] = useState<IptvChannel[]>([]);
  const [customChannels, setCustomChannels] = useState<IptvChannel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [filterCountry, setFilterCountry] = useState<IptvCountryCode>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [onlyCustom, setOnlyCustom] = useState<boolean>(false);

  // Form state
  const [name, setName] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [country, setCountry] = useState<IptvCountryCode>('BO');
  const [group, setGroup] = useState('Fútbol Boliviano');
  const [resolution, setResolution] = useState('1080p');
  const [logo, setLogo] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Probe state
  const [probingUrl, setProbingUrl] = useState<string | null>(null);
  const [probeResult, setProbeResult] = useState<{
    url: string;
    reachable: boolean;
    latencyMs?: number;
    error?: string;
  } | null>(null);

  // Toast confirmation
  const [assignedMessage, setAssignedMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [all, custom] = await Promise.all([
        iptvService.getChannels({ forceRefresh: true }),
        iptvService.getCustomChannels(),
      ]);
      setChannels(all);
      setCustomChannels(custom);
    } catch (err) {
      console.error('[IptvChannelsManager] Error cargando canales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProbeUrl = async (urlToTest: string) => {
    if (!urlToTest || !urlToTest.startsWith('http')) return;
    setProbingUrl(urlToTest);
    setProbeResult(null);

    const res = await iptvService.probeStreamUrl(urlToTest);
    setProbeResult({
      url: urlToTest,
      reachable: res.reachable,
      latencyMs: res.latencyMs,
      error: res.error,
    });
    setProbingUrl(null);
  };

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!name.trim()) {
      setFormError('Por favor ingresa el nombre del canal.');
      return;
    }
    if (!streamUrl.trim() || !streamUrl.startsWith('http')) {
      setFormError('La URL del stream debe comenzar con http:// o https://');
      return;
    }

    setIsSubmitting(true);
    try {
      const countryObj = IPTV_COUNTRIES.find((c) => c.code === country);
      await iptvService.addCustomChannel({
        name: name.trim(),
        streamUrl: streamUrl.trim(),
        country,
        countryName: countryObj ? countryObj.label : country,
        group: group.trim() || 'Fútbol Boliviano',
        resolution,
        logo: logo.trim(),
        notes: notes.trim(),
      });

      setFormSuccess(`Canal «${name}» agregado y publicado exitosamente.`);
      setName('');
      setStreamUrl('');
      setLogo('');
      setNotes('');
      setProbeResult(null);
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || 'Error al guardar canal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustom = async (id: string, channelName: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar el canal «${channelName}»?`)) return;
    const ok = await iptvService.deleteCustomChannel(id);
    if (ok) {
      await loadData();
    }
  };

  const handleSetMatchStream = (url: string, cName: string) => {
    if (onSetMatchStreamUrl) {
      onSetMatchStreamUrl(url, cName);
      setAssignedMessage(`¡Señal «${cName}» asignada al reproductor del partido!`);
      setTimeout(() => setAssignedMessage(null), 4000);
    }
  };

  const displayedChannels = channels.filter((c) => {
    if (onlyCustom && !c.isCustom) return false;
    if (filterCountry !== 'ALL' && c.country !== filterCountry) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      return (
        c.name.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q) ||
        c.countryName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Banner Principal */}
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider font-display flex items-center gap-2">
                <span>Gestión de Canales IPTV Deportivos</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 normal-case">
                  En Vivo
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configura señales personalizadas para el fútbol boliviano y enlaza transmisiones al partido actual con 1 clic.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-red-950/40 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? 'Cerrar Formulario' : 'Agregar Canal IPTV'}</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Recargar catálogo"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Toast de confirmación */}
      {assignedMessage && (
        <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{assignedMessage}</span>
        </div>
      )}

      {/* Formulario para agregar canal */}
      {showAddForm && (
        <form
          onSubmit={handleAddChannel}
          className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Zap className="w-4 h-4" />
              <span>Nuevo Canal Deportivo Personalizado</span>
            </div>
            <span className="text-[11px] text-slate-400">Aparecerá en la pestaña pública IPTV y en el selector de señales</span>
          </div>

          {formError && (
            <div className="p-3 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nombre del Canal <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Tigo Sports 1 Bolivia HD"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                País de Emisión
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value as IptvCountryCode)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {IPTV_COUNTRIES.filter((c) => c.code !== 'ALL').map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.label} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                URL de Transmisión (.m3u8 o stream directo HLS) <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  required
                  placeholder="https://.../live/playlist.m3u8"
                  value={streamUrl}
                  onChange={(e) => setStreamUrl(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => handleProbeUrl(streamUrl)}
                  disabled={!streamUrl || probingUrl === streamUrl}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <Activity className={`w-3.5 h-3.5 ${probingUrl === streamUrl ? 'animate-spin text-amber-400' : ''}`} />
                  <span>Probar Señal</span>
                </button>
              </div>

              {/* Resultado de prueba de señal en el formulario */}
              {probeResult && probeResult.url === streamUrl && (
                <div
                  className={`mt-2 p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                    probeResult.reachable
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-red-500/10 border-red-500/30 text-red-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {probeResult.reachable ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span>
                      {probeResult.reachable
                        ? 'Señal activa y respondiendo correctamente'
                        : `Error al probar señal: ${probeResult.error || 'No responde'}`}
                    </span>
                  </div>
                  {probeResult.latencyMs !== undefined && (
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-black/40">
                      {probeResult.latencyMs} ms
                    </span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Categoría / Grupo
              </label>
              <input
                type="text"
                placeholder="Ej. Liga Tigo, Eliminatorias, Fútbol Boliviano"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Resolución
              </label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="1080p">1080p Full HD</option>
                <option value="720p">720p HD</option>
                <option value="4K">4K Ultra HD</option>
                <option value="HD">HD Adaptativo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                URL del Logo (Opcional)
              </label>
              <input
                type="url"
                placeholder="https://.../logo.png"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Notas Técnicas (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. Señal principal del Superclásico"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar y Publicar Canal'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Controles de Filtro y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Buscar canal, grupo o país..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-full sm:w-64"
          />

          <select
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value as IptvCountryCode)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            {IPTV_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
          <button
            type="button"
            onClick={() => setOnlyCustom(!onlyCustom)}
            className={`px-3 py-1.5 rounded-lg border font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              onlyCustom
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Solo Canales Admin ({customChannels.length})</span>
          </button>

          <span className="text-[11px] text-slate-500 font-mono">
            {displayedChannels.length} canal{displayedChannels.length === 1 ? '' : 'es'}
          </span>
        </div>
      </div>

      {/* Lista de Canales */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
          <span>Cargando catálogo de señales IPTV...</span>
        </div>
      ) : displayedChannels.length === 0 ? (
        <div className="py-12 text-center bg-slate-900/30 border border-slate-800 rounded-2xl p-6 text-slate-400 text-xs">
          <Tv className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="font-semibold text-slate-300">No se encontraron canales con los filtros seleccionados.</p>
          <p className="text-[11px] text-slate-500 mt-1">Usa el botón «Agregar Canal IPTV» para registrar una nueva señal.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {displayedChannels.map((channel) => {
            const isMatchActive = activeMatchStreamUrl === channel.streamUrl;
            return (
              <div
                key={channel.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                  isMatchActive
                    ? 'bg-emerald-950/20 border-emerald-500/50 shadow-lg shadow-emerald-950/30'
                    : channel.isCustom
                    ? 'bg-slate-900/90 border-amber-500/40 hover:border-amber-500/70'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {channel.logo ? (
                        <img
                          src={channel.logo}
                          alt={channel.name}
                          className="w-9 h-9 object-contain rounded-lg bg-slate-950 p-1 border border-slate-800 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0 font-bold text-xs">
                          {channel.country}
                        </div>
                      )}

                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate font-display">
                          {channel.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                          <span>{channel.countryName}</span>
                          <span>•</span>
                          <span className="truncate">{channel.group}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {channel.isCustom ? (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          ADMIN
                        </span>
                      ) : channel.isDemoFeed ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          TEST
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          FAST 24/7
                        </span>
                      )}

                      {channel.resolution && (
                        <span className="text-[9px] font-mono text-slate-400">
                          {channel.resolution}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2 py-1 rounded border border-slate-800/80 truncate">
                    {channel.streamUrl}
                  </div>

                  {channel.notes && (
                    <p className="mt-1.5 text-[10px] text-slate-400 line-clamp-1 italic">
                      {channel.notes}
                    </p>
                  )}
                </div>

                {/* Acciones del canal */}
                <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-800/80 text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleProbeUrl(channel.streamUrl)}
                      disabled={probingUrl === channel.streamUrl}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1 transition cursor-pointer"
                      title="Probar conectividad de la señal"
                    >
                      <Activity className={`w-3 h-3 ${probingUrl === channel.streamUrl ? 'animate-spin text-amber-400' : ''}`} />
                      <span>Probar</span>
                    </button>

                    {channel.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCustom(channel.id, channel.name)}
                        className="p-1 rounded text-red-400 hover:bg-red-500/20 transition cursor-pointer"
                        title="Eliminar canal personalizado"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSetMatchStream(channel.streamUrl, channel.name)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                      isMatchActive
                        ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                        : 'bg-red-600/90 hover:bg-red-500 text-white shadow-sm shadow-red-950'
                    }`}
                  >
                    <Zap className="w-3 h-3" />
                    <span>{isMatchActive ? 'Señal en Vivo' : 'Transmitir en Partido'}</span>
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
