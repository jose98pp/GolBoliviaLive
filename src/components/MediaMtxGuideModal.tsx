import React, { useState } from 'react';
import { X, Copy, Check, Terminal, ExternalLink, Video, Radio, Cpu, ShieldCheck, Zap } from 'lucide-react';

interface MediaMtxGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MediaMtxGuideModal: React.FC<MediaMtxGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const sampleYaml = `# mediamtx.yml (Configuración recomendada para GolBolivia Live)
rtmp: yes
rtmpAddress: :1935

hls: yes
hlsAddress: :8888
hlsAlwaysRemux: yes
hlsVariant: fmp4
hlsSegmentCount: 5
hlsSegmentDuration: 1s
hlsAllowOrigin: '*'
`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#090e1d] border border-amber-500/40 rounded-2xl p-5 sm:p-7 shadow-2xl shadow-black/90 my-8 text-slate-100">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white font-display">
                  Guía de Conexión: MediaMTX + OBS Studio
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                  HLS / fMP4
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Paso a paso para transmitir desde tu computadora o VPS hacia GolBolivia Live.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 text-xs text-slate-300">
          {/* Concepto básico */}
          <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-start gap-3">
            <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">¿Cómo funciona el flujo de transmisión?</strong>
              <p className="text-slate-400 mt-0.5 leading-relaxed">
                <strong>OBS Studio</strong> envía el video mediante <strong>RTMP</strong> (puerto 1935) a <strong>MediaMTX</strong>.
                MediaMTX lo transforma en tiempo real a <strong>HLS (.m3u8)</strong> (puerto 8888) para que se reproduzca en la web de GolBolivia Live con soporte en todos los celulares y computadoras.
              </p>
            </div>
          </div>

          {/* PASO 1 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold font-display text-sm">
              <span className="w-5 h-5 rounded-full bg-amber-400/20 flex items-center justify-center text-xs">1</span>
              <span>Descargar y Ejecutar MediaMTX</span>
            </div>
            <p className="text-slate-400">
              MediaMTX es un programa gratuito de un solo archivo ejecutable (.exe en Windows o binario en Linux/Mac).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              <a
                href="https://github.com/bluenviron/mediamtx/releases"
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-between text-slate-200 transition-colors"
              >
                <span>Descargar ejecutable (GitHub Oficial)</span>
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              </a>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between font-mono text-[11px]">
                <span className="text-slate-400">Docker:</span>
                <button
                  onClick={() => copyToClipboard('docker run --rm -it -p 1935:1935 -p 8888:8888 bluenviron/mediamtx', 'docker')}
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                >
                  {copiedKey === 'docker' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar comando</span>
                </button>
              </div>
            </div>
          </div>

          {/* PASO 2 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold font-display text-sm">
              <span className="w-5 h-5 rounded-full bg-amber-400/20 flex items-center justify-center text-xs">2</span>
              <span>Ajuste en `mediamtx.yml` (Habilitar CORS)</span>
            </div>
            <p className="text-slate-400">
              Para que el navegador web pueda cargar el video sin bloqueos, abre <code className="text-slate-200">mediamtx.yml</code> y asegúrate de tener:
            </p>
            <div className="relative bg-[#050811] p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-300">
              <pre className="overflow-x-auto">{sampleYaml}</pre>
              <button
                onClick={() => copyToClipboard(sampleYaml, 'yaml')}
                className="absolute top-2.5 right-2.5 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] flex items-center gap-1 border border-slate-700"
              >
                {copiedKey === 'yaml' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copiar Config</span>
              </button>
            </div>
          </div>

          {/* PASO 3 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold font-display text-sm">
              <span className="w-5 h-5 rounded-full bg-amber-400/20 flex items-center justify-center text-xs">3</span>
              <span>Configuración en OBS Studio</span>
            </div>
            <p className="text-slate-400">
              Abre OBS Studio &gt; <strong>Ajustes</strong> &gt; <strong>Emisión</strong>:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 text-[10px] block">Servicio:</span>
                <strong className="text-white">Personalizado...</strong>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Servidor:</span>
                <div className="flex items-center justify-between font-mono text-emerald-400">
                  <span>rtmp://localhost:1935/live</span>
                  <button onClick={() => copyToClipboard('rtmp://localhost:1935/live', 'rtmp')} className="hover:text-white">
                    {copiedKey === 'rtmp' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Clave de retransmisión:</span>
                <div className="flex items-center justify-between font-mono text-amber-400">
                  <span>bolivia</span>
                  <button onClick={() => copyToClipboard('bolivia', 'key')} className="hover:text-white">
                    {copiedKey === 'key' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Intervalo Keyframes (en Ajustes &gt; Salida):</span>
                <strong className="text-white">2 segundos</strong> (para evitar delay)
              </div>
            </div>
            <p className="text-slate-400 text-[11px]">
              Pulsa <strong>&quot;Iniciar transmisión&quot;</strong> en OBS. MediaMTX mostrará en su consola: <code className="text-emerald-400 font-mono">[RTMP] [conn] is publishing to &apos;live/bolivia&apos;</code>.
            </p>
          </div>

          {/* PASO 4 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold font-display text-sm">
              <span className="w-5 h-5 rounded-full bg-amber-400/20 flex items-center justify-center text-xs">4</span>
              <span>Pegar URL en GolBolivia Live (Solución HTTPS con Cloudflare)</span>
            </div>
            <p className="text-slate-400">
              La URL local directa de MediaMTX es:
            </p>
            <div className="p-2.5 bg-[#050811] rounded-xl border border-slate-800 font-mono text-slate-300 flex items-center justify-between">
              <span className="text-emerald-400">http://localhost:8888/live/bolivia/index.m3u8</span>
              <button onClick={() => copyToClipboard('http://localhost:8888/live/bolivia/index.m3u8', 'hls_local')} className="hover:text-white">
                {copiedKey === 'hls_local' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl space-y-1.5">
              <strong className="text-amber-300 block">¿Transmitir a espectadores en internet por Vercel (HTTPS)?</strong>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Como Vercel usa <strong>HTTPS</strong>, los navegadores bloquean URLs que empiezan con <code className="text-red-400">http://</code>.
                Para obtener un enlace seguro <strong>HTTPS</strong> gratis sin abrir puertos en tu router:
              </p>
              <div className="p-2 bg-black/60 rounded-lg font-mono text-emerald-400 flex items-center justify-between text-[11px]">
                <span>cloudflared tunnel --url http://localhost:8888</span>
                <button onClick={() => copyToClipboard('cloudflared tunnel --url http://localhost:8888', 'tunnel')} className="text-slate-300 hover:text-white">
                  {copiedKey === 'tunnel' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <p className="text-slate-400 text-[11px]">
                Copia la URL segura que te dé Cloudflare (ej. <code className="text-slate-200">https://xyz.trycloudflare.com/live/bolivia/index.m3u8</code>) y pégala en el campo <strong>URL de Video (HLS/MP4)</strong> de tu consola.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg transition-colors cursor-pointer"
          >
            Entendido, volver a la consola
          </button>
        </div>
      </div>
    </div>
  );
};
