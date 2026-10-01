import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Video,
  Radio,
  Sliders,
  CheckCircle2,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

interface ObsStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  isStreamingLive: boolean;
  setIsStreamingLive: (val: boolean) => void;
}

export const ObsStudioModal: React.FC<ObsStudioModalProps> = ({
  isOpen,
  onClose,
  isStreamingLive,
  setIsStreamingLive,
}) => {
  const [streamServer, setStreamServer] = useState('rtmp://live.boliviagol.tv/live');
  const [streamKey, setStreamKey] = useState('live_bol_cl4s1co_99482');
  const [showKey, setShowKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedQualityProfile, setSelectedQualityProfile] = useState<'1080p' | '720p' | '480p'>('1080p');
  const [mode, setMode] = useState<'quick_start' | 'rtmp_credentials'>('quick_start');

  if (!isOpen) return null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRegenerateKey = () => {
    const randomHex = Math.random().toString(36).substring(2, 8) + '_' + Math.random().toString(36).substring(2, 6);
    setStreamKey(`live_bol_${randomHex}`);
  };

  const handleDownloadObsConfig = () => {
    const configContent = `[OBS_GolBolivia_Profile]
Name=GolBolivia Live Streaming
ServerURL=${streamServer}
StreamKey=${streamKey}
VideoBitrate=${selectedQualityProfile === '1080p' ? 6000 : selectedQualityProfile === '720p' ? 3500 : 1500}
AudioBitrate=160
Encoder=NVENC_H264_or_x264
RateControl=CBR
KeyframeInterval=2
TargetPlatform=GolBolivia Live Division Profesional
`;
    const blob = new Blob([configContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `golbolivia-obs-config-${selectedQualityProfile}.ini`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#0b101d] border border-slate-700/80 rounded-2xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl text-slate-100 my-auto relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/15 border border-yellow-500/40 flex items-center justify-center text-yellow-400">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg sm:text-xl text-white">
              Centro de Emisión OBS Studio
            </h2>
            <p className="text-xs text-slate-400">
              Configura tu software de transmisión (OBS Studio, vMix o Streamlabs) para transmitir fútbol en vivo.
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-2 p-1 bg-[#070b14] border border-slate-800 rounded-xl mb-4 text-xs font-semibold">
          <button
            onClick={() => setMode('quick_start')}
            className={`flex-1 py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'quick_start'
                ? 'bg-emerald-600 text-black font-bold shadow-md shadow-emerald-950/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Emitir Ya con OBS Virtual Cam</span>
          </button>
          <button
            onClick={() => setMode('rtmp_credentials')}
            className={`flex-1 py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'rtmp_credentials'
                ? 'bg-yellow-500 text-black font-bold shadow-md shadow-yellow-950/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Servidor RTMP & Clave</span>
          </button>
        </div>

        {mode === 'quick_start' && (
          <div className="space-y-4 mb-5">
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-slate-200">
              <h3 className="font-bold text-emerald-400 text-sm mb-2 flex items-center gap-2">
                <Video className="w-4 h-4" />
                ¿Cómo emitir ahora mismo desde OBS Studio?
              </h3>
              <p className="text-slate-300 text-xs mb-3 leading-relaxed">
                Puedes transmitir de forma inmediata directamente a GolBolivia Live sin necesidad de configurar un servidor RTMP externo costoso, usando la función nativa de <strong>Cámara Virtual de OBS</strong> o <strong>Captura de Pantalla</strong>.
              </p>

              <div className="space-y-2.5 bg-[#070b14] p-3 rounded-xl border border-slate-800/80">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-black font-bold text-xs flex items-center justify-center shrink-0">1</span>
                  <div className="text-xs">
                    <strong className="text-white block">Abre OBS Studio</strong>
                    <span className="text-slate-400">Prepara tu partido, cámara, marcador o escenas en tu pantalla de OBS como de costumbre.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-black font-bold text-xs flex items-center justify-center shrink-0">2</span>
                  <div className="text-xs">
                    <strong className="text-white block">Haz clic en &quot;Iniciar cámara virtual&quot; en OBS</strong>
                    <span className="text-slate-400">Está en el panel de &quot;Controles&quot; de OBS (abajo a la derecha, debajo de Iniciar transmisión).</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-black font-bold text-xs flex items-center justify-center shrink-0">3</span>
                  <div className="text-xs">
                    <strong className="text-white block">Activa &quot;OBS Cam&quot; o &quot;Pantalla&quot; en GolBolivia</strong>
                    <span className="text-slate-400">Haz clic en el botón <code className="bg-slate-800 text-emerald-400 px-1 py-0.5 rounded font-mono">OBS Cam</code> que está sobre el reproductor de video y selecciona <em>OBS Virtual Camera</em>.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#070b14] rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-300">¿Tienes una URL directa HLS (.m3u8) o MP4 de tu servidor?</span>
              <span className="text-yellow-400 font-medium">Pégala en el Panel Transmisor</span>
            </div>
          </div>
        )}

        {mode === 'rtmp_credentials' && (
          <div>
            {/* Streaming Credentials Cards */}
            <div className="space-y-3.5 mb-5">
              {/* RTMP Server URL */}
              <div className="p-3 bg-[#070b14] border border-slate-800 rounded-xl">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-300">Servidor RTMP / URL de Ingesta</span>
                  <span className="text-[10px] text-emerald-400 font-mono">En Línea</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={streamServer}
                    className="flex-1 bg-slate-900 border border-slate-750 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 select-all focus:outline-none"
                  />
                  <button
                    onClick={() => handleCopy(streamServer, 'server')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedField === 'server' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Stream Key */}
              <div className="p-3 bg-[#070b14] border border-slate-800 rounded-xl">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-300">Clave de Retransmisión (Stream Key)</span>
                  <button
                    onClick={handleRegenerateKey}
                    className="text-[11px] text-yellow-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Generar nueva clave</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKey ? 'text' : 'password'}
                      readOnly
                      value={streamKey}
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 select-all focus:outline-none"
                    />
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      title={showKey ? 'Ocultar clave' : 'Mostrar clave'}
                    >
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    onClick={() => handleCopy(streamKey, 'key')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedField === 'key' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  No compartas tu clave de transmisión con nadie; permite emitir directamente a tu canal.
                </p>
              </div>
            </div>

            {/* OBS Profile Quality Presets */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Parámetros Recomendados para OBS Studio
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '1080p', label: '1080p60 (Full HD)', bitrate: '6.000 Kbps', preset: 'NVENC / x264' },
                  { id: '720p', label: '720p60 (Estándar)', bitrate: '3.500 Kbps', preset: 'Equilibrado' },
                  { id: '480p', label: '480p (Móvil)', bitrate: '1.500 Kbps', preset: 'Bajo Ancho de Banda' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedQualityProfile(p.id as '1080p' | '720p' | '480p')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedQualityProfile === p.id
                        ? 'border-emerald-500 bg-emerald-950/40 text-white'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-850'
                    }`}
                  >
                    <div className="font-bold text-xs">{p.label}</div>
                    <div className="text-[11px] font-mono text-emerald-400">{p.bitrate}</div>
                    <div className="text-[10px] text-slate-400">{p.preset}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="bg-[#070b14] border border-slate-800/80 rounded-xl p-3.5 mb-5 text-xs text-slate-300">
              <h4 className="font-semibold text-white mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Pasos para conectar OBS en 30 segundos
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                <li>En OBS Studio, ve a <strong className="text-white">Ajustes &gt; Emisión</strong>.</li>
                <li>En Servicio, elige <strong className="text-white">Personalizado...</strong></li>
                <li>Pega el <strong className="text-white">Servidor</strong> y la <strong className="text-white">Clave de Retransmisión</strong> de arriba.</li>
                <li>En Salida: Control de frecuencia <strong className="text-white">CBR</strong>, Intervalo de fotogramas clave <strong className="text-white">2 seg</strong>.</li>
                <li>Haz clic en <strong className="text-emerald-400">Iniciar transmisión</strong> en OBS.</li>
              </ol>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={handleDownloadObsConfig}
            className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-750 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-yellow-400" />
            <span>Descargar Perfil OBS (.ini)</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsStreamingLive(!isStreamingLive)}
              className={`flex-1 sm:flex-none px-4 py-2 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer ${
                isStreamingLive
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/50'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-black shadow-emerald-950/50'
              }`}
            >
              {isStreamingLive ? 'Detener Emisión en Vivo' : 'Marcar Transmisión En Vivo'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Listo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
