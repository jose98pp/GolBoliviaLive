import React, { useState } from 'react';
import {
  Radio,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Play,
  Shield,
  Zap,
  Check,
  ExternalLink,
  Tv
} from 'lucide-react';
import { StreamSettings } from '../types/football';
import { apiClient } from '../services/apiClient';

interface FailoverChannelPanelProps {
  streamSettings: StreamSettings;
  onUpdateStreamSettings: (newSettings: Partial<StreamSettings>) => void;
  onPreviewReload?: () => void;
}

interface BackupPreset {
  id: string;
  name: string;
  url: string;
  description: string;
  quality: string;
  category: 'sports' | 'test' | 'highlights';
}

const BACKUP_PRESETS: BackupPreset[] = [
  {
    id: 'golbolivia-247',
    name: 'GolBolivia 24/7 Señal de Respaldo HD',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    description: 'Bucle oficial de transmisiones previas, repeticiones y goles del fútbol boliviano en 1080p.',
    quality: '1080p60 Multi-bitrate HLS',
    category: 'sports',
  },
  {
    id: 'akamai-live-test',
    name: 'Canal de Emergencia HLS (Akamai Global)',
    url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
    description: 'Flujo internacional de alta estabilidad con codificación H.264/AAC garantizada.',
    quality: '720p60 Adaptativo',
    category: 'test',
  },
  {
    id: 'livepush-backup',
    name: 'Señal Alternativa de Bajas Latencias',
    url: 'https://live-par-2-abr.livepush.io/live/bigbuckbunny/index.m3u8',
    description: 'Servidor CDN con baja latencia ideal para móviles y conexiones lentas en Bolivia.',
    quality: '1080p/720p/480p ABR',
    category: 'highlights',
  },
];

export const FailoverChannelPanel: React.FC<FailoverChannelPanelProps> = ({
  streamSettings,
  onUpdateStreamSettings,
  onPreviewReload,
}) => {
  const [backupUrlInput, setBackupUrlInput] = useState<string>(
    streamSettings.backupVideoUrl || BACKUP_PRESETS[0].url
  );
  const [channelNameInput, setChannelNameInput] = useState<string>(
    streamSettings.backupChannelName || BACKUP_PRESETS[0].name
  );
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeSource = streamSettings.activeStreamSource || (streamSettings.customVideoUrl ? 'obs' : 'simulation');
  const isAutoFailover = streamSettings.autoFailoverEnabled !== false;

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const handleSelectPreset = (preset: BackupPreset) => {
    setBackupUrlInput(preset.url);
    setChannelNameInput(preset.name);
  };

  const handleApplyFailoverSource = async (source: 'obs' | 'backup' | 'simulation') => {
    setIsSaving(true);
    try {
      await apiClient.failoverStream({
        activeStreamSource: source,
        backupVideoUrl: backupUrlInput.trim(),
        backupChannelName: channelNameInput.trim(),
        autoFailoverEnabled: isAutoFailover,
      });

      onUpdateStreamSettings({
        activeStreamSource: source,
        backupVideoUrl: backupUrlInput.trim(),
        backupChannelName: channelNameInput.trim(),
        broadcastMode: source === 'obs' ? 'obs_custom' : (source === 'backup' ? 'obs_custom' : 'simulation'),
      });

      onPreviewReload?.();
      showFeedback(`¡Señal conmutada con éxito! Ahora los espectadores están viendo: ${source === 'obs' ? 'OBS Studio Principal' : source === 'backup' ? 'Canal de Respaldo M3U8' : 'Simulación 2D'}`);
    } catch (err: any) {
      showFeedback(err.message || 'Error al conmutar señal en el backend', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBackupSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupUrlInput.trim()) {
      showFeedback('Por favor introduce una URL válida de lista M3U8.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.failoverStream({
        backupVideoUrl: backupUrlInput.trim(),
        backupChannelName: channelNameInput.trim() || 'Canal de Respaldo M3U8',
        autoFailoverEnabled: isAutoFailover,
      });

      onUpdateStreamSettings({
        backupVideoUrl: backupUrlInput.trim(),
        backupChannelName: channelNameInput.trim() || 'Canal de Respaldo M3U8',
      });

      showFeedback('Configuración del canal de respaldo guardada en el servidor.');
    } catch (err: any) {
      showFeedback(err.message || 'Error al guardar configuración', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAutoFailover = async () => {
    const nextVal = !isAutoFailover;
    try {
      await apiClient.failoverStream({ autoFailoverEnabled: nextVal });
      onUpdateStreamSettings({ autoFailoverEnabled: nextVal });
      showFeedback(`Conmutación automática de respaldo ${nextVal ? 'ACTIVADA' : 'DESACTIVADA'}.`);
    } catch {
      showFeedback('Error al actualizar conmutación automática', 'error');
    }
  };

  return (
    <div className="bg-[#0b1222] border-2 border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center shadow-lg shadow-amber-950/50">
            <Radio className="w-5 h-5 text-black" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <span>Centro de Conmutación & Canal de Respaldo (Failover M3U8)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                PRO BROADCAST
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Garantiza que la transmisión nunca se corte. Si no estás emitiendo por OBS, commuta a una lista M3U8 en tiempo real.
            </p>
          </div>
        </div>

        {/* Current Active Source Pill */}
        <div className="flex items-center gap-2 bg-[#060a14] px-3 py-1.5 rounded-xl border border-slate-700/80">
          <span className="text-[11px] text-slate-400">Emisión al aire:</span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold ${
            activeSource === 'obs'
              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
              : activeSource === 'backup'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
          }`}>
            <span className={`w-2 h-2 rounded-full ${activeSource === 'obs' ? 'bg-red-500 animate-pulse' : activeSource === 'backup' ? 'bg-amber-400 animate-ping' : 'bg-blue-400'}`} />
            {activeSource === 'obs' ? 'OBS PRINCIPAL' : activeSource === 'backup' ? 'CANAL RESPALDO M3U8' : 'SIMULACIÓN 2D'}
          </span>
        </div>
      </div>

      {/* 3-Way Instant Source Switcher */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
          Conmutar Fuente de Transmisión Inmediata (En vivo para todos los espectadores):
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Option 1: OBS Direct */}
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleApplyFailoverSource('obs')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              activeSource === 'obs'
                ? 'bg-gradient-to-br from-red-950/80 to-slate-900 border-red-500 shadow-xl shadow-red-950/60 ring-2 ring-red-500/30'
                : 'bg-slate-900/60 hover:bg-slate-850 border-slate-850 hover:border-slate-750 text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-xs font-bold text-white">
                <span className={`w-2.5 h-2.5 rounded-full ${activeSource === 'obs' ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`} />
                1. Señal Principal OBS
              </span>
              {activeSource === 'obs' && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500 text-black font-extrabold">ACTIVO</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Ingesta RTMP / SRT directa desde OBS Studio a MediaMTX.
            </p>
          </button>

          {/* Option 2: Backup M3U8 Channel */}
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleApplyFailoverSource('backup')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              activeSource === 'backup'
                ? 'bg-gradient-to-br from-amber-950/80 to-slate-900 border-amber-500 shadow-xl shadow-amber-950/60 ring-2 ring-amber-500/30'
                : 'bg-slate-900/60 hover:bg-slate-850 border-slate-850 hover:border-slate-750 text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-xs font-bold text-white">
                <span className={`w-2.5 h-2.5 rounded-full ${activeSource === 'backup' ? 'bg-amber-400 animate-ping' : 'bg-slate-600'}`} />
                2. Canal de Respaldo M3U8
              </span>
              {activeSource === 'backup' && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400 text-black font-extrabold">ACTIVO</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Playlist HLS alternativa para cuando no estés transmitiendo por OBS.
            </p>
          </button>

          {/* Option 3: Virtual 2D Simulation */}
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleApplyFailoverSource('simulation')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              activeSource === 'simulation'
                ? 'bg-gradient-to-br from-blue-950/80 to-slate-900 border-blue-500 shadow-xl shadow-blue-950/60 ring-2 ring-blue-500/30'
                : 'bg-slate-900/60 hover:bg-slate-850 border-slate-850 hover:border-slate-750 text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-xs font-bold text-white">
                <span className={`w-2.5 h-2.5 rounded-full ${activeSource === 'simulation' ? 'bg-blue-400' : 'bg-slate-600'}`} />
                3. Simulación 2D & VAR
              </span>
              {activeSource === 'simulation' && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-400 text-black font-extrabold">ACTIVO</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Cancha virtual táctica interactiva con animaciones de jugadas.
            </p>
          </button>
        </div>
      </div>

      {/* Auto-Failover Switch */}
      <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <span className="text-xs font-bold text-white block">
              Conmutación Automática por Caída de Señal (Auto-Failover Guard)
            </span>
            <span className="text-[11px] text-slate-400">
              Si el encoder OBS se desconecta o la red cae, el reproductor de los hinchas conmuta automáticamente a la lista M3U8 de respaldo sin pantalla negra.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleAutoFailover}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
            isAutoFailover ? 'bg-emerald-500' : 'bg-slate-700'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              isAutoFailover ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Backup Channel Configuration Form */}
      <form onSubmit={handleSaveBackupSettings} className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-white flex items-center gap-1.5">
            <Tv className="w-4 h-4 text-amber-400" />
            <span>Configuración de la Lista de Respaldo M3U8</span>
          </label>
          <span className="text-[11px] text-slate-400">
            Formato: <code className="text-emerald-400 font-mono">.m3u8</code> (HLS)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
              Nombre de la Señal de Respaldo:
            </label>
            <input
              type="text"
              value={channelNameInput}
              onChange={(e) => setChannelNameInput(e.target.value)}
              placeholder="Ej: GolBolivia 24/7 Señal HD"
              className="w-full bg-[#060a14] border border-slate-750 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
              URL del Flujo M3U8 de Respaldo:
            </label>
            <input
              type="url"
              value={backupUrlInput}
              onChange={(e) => setBackupUrlInput(e.target.value)}
              placeholder="https://servidor.com/live/respaldo/index.m3u8"
              className="w-full bg-[#060a14] border border-slate-750 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Quick Presets Carousel */}
        <div className="space-y-1.5">
          <span className="text-[11px] text-slate-400 font-medium block">
            Canales y flujos de respaldo sugeridos (1 clic para cargar):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {BACKUP_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                  backupUrlInput === p.url
                    ? 'bg-amber-500/15 border-amber-500/50 text-white ring-1 ring-amber-500/30'
                    : 'bg-slate-900/60 hover:bg-slate-850 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                  <span className="truncate">{p.name}</span>
                  {backupUrlInput === p.url && <Check className="w-3.5 h-3.5 shrink-0" />}
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{p.description}</p>
                <span className="text-[9px] font-mono text-slate-500 block mt-1">{p.quality}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Save & Apply Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
          >
            <span>Guardar Configuración de Respaldo</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleApplyFailoverSource('backup')}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/60 cursor-pointer active:scale-95"
          >
            <Zap className="w-4 h-4 text-black" />
            <span>ACTIVAR CANAL DE RESPALDO AL AIRE AHORA</span>
          </button>
        </div>
      </form>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-fade-in ${
          feedbackMsg.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200'
            : 'bg-red-950/90 border-red-500/60 text-red-200'
        }`}>
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}
    </div>
  );
};
