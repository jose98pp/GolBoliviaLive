import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Upload, Download, CheckCircle2, AlertCircle, Sparkles, FileText, Image, RefreshCw, Heart, ShieldCheck, Lock } from 'lucide-react';
import { DonationQrInfo } from '../types/football';
import { apiClient } from '../services/apiClient';

interface DonationQrAdminCardProps {
  initialQr?: DonationQrInfo;
  onQrUpdated?: (qr: DonationQrInfo) => void;
}

export const DonationQrAdminCard: React.FC<DonationQrAdminCardProps> = ({
  initialQr,
  onQrUpdated,
}) => {
  const [imageUrl, setImageUrl] = useState<string>(initialQr?.imageUrl || '');
  const [instructions, setInstructions] = useState<string>(
    initialQr?.instructions || 'Escanea o descarga este código QR desde tu aplicación bancaria móvil para realizar tu aporte.'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialQr) {
      if (initialQr.imageUrl !== undefined) setImageUrl(initialQr.imageUrl);
      if (initialQr.instructions) setInstructions(initialQr.instructions);
    }
  }, [initialQr]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMsg({ type: 'error', text: 'El archivo seleccionado debe ser una imagen válida (PNG, JPG, SVG o WEBP).' });
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setStatusMsg({ type: 'error', text: 'La imagen excede el límite de 3MB. Por favor sube una imagen optimizada.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImageUrl(result);
      setStatusMsg({ type: 'ok', text: 'Imagen cargada en vista previa. Recuerda presionar «GUARDAR CÓDIGO QR».'});
      setTimeout(() => setStatusMsg(null), 5000);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMsg(null);
    try {
      const payload: DonationQrInfo = {
        imageUrl: imageUrl.trim(),
        instructions: instructions.trim(),
        updatedAt: Date.now(),
      };

      const res = await apiClient.saveDonationQr(payload);
      setStatusMsg({ type: 'ok', text: '✅ Código QR guardado y sincronizado con éxito para el botón «Apóyame».' });
      onQrUpdated?.(res.donationQr || payload);
      setTimeout(() => setStatusMsg(null), 6000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `❌ Error al guardar QR: ${err.message || 'Error de red o permisos.'}` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPreview = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = 'QR-GolBolivia-Admin.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="seccion-qr-apoyame" className="bg-[#0a0f1d] border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
      {/* Glow ambient background */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
            <Heart className="w-5 h-5 fill-rose-500 text-rose-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white font-display uppercase tracking-wide">
                Configuración del Código QR (Botón «Apóyame»)
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                EN VIVO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Aquí cambias la imagen del código QR que los hinchas descargan al presionar el botón «Apóyame».
            </p>
          </div>
        </div>

        {imageUrl && (
          <button
            type="button"
            onClick={handleDownloadPreview}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer self-start sm:self-auto"
            title="Descargar imagen del QR actual"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Descargar QR</span>
          </button>
        )}
      </div>

      {/* Notice about hidden Bank & Titular */}
      <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
        <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>
          <strong>Privacidad activa:</strong> El nombre de banco y el titular han sido retirados. El hincha ve únicamente el código QR limpio y las instrucciones.
        </span>
      </div>

      {/* Status banner */}
      {statusMsg && (
        <div
          className={`mt-3 p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
            statusMsg.type === 'ok'
              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
              : 'bg-red-950/80 text-red-300 border border-red-500/40'
          }`}
        >
          {statusMsg.type === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Form & Preview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-4">
        {/* Left Column: Form Fields */}
        <div className="md:col-span-7 space-y-4">
          {/* File Upload Trigger */}
          <div>
            <label className="block text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Subir Nueva Imagen de QR:</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="qr-file-upload-input"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-3 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-dashed border-amber-500/50 hover:border-amber-400 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Image className="w-4 h-4 text-amber-400" />
                <span>{imageUrl ? 'Subir Otra Imagen de QR' : 'Seleccionar Imagen de QR (PNG / JPG / SVG)'}</span>
              </button>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="px-3.5 py-3 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-semibold cursor-pointer transition"
                  title="Eliminar QR actual"
                >
                  Quitar
                </button>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Formatos recomendados: PNG o JPG cuadrado. Máx. 3 MB.
            </span>
          </div>

          {/* Direct URL input (optional alternative) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              O pegar enlace directo (URL web) de la imagen:
            </label>
            <input
              type="text"
              value={imageUrl.startsWith('data:') ? '(Imagen cargada desde archivo)' : imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://.../mi-qr-apoyo.png"
              className="w-full bg-slate-900 border border-slate-750 focus:border-amber-500 rounded-xl p-2.5 text-white font-mono text-xs focus:outline-none"
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Instrucciones breves para el hincha:</span>
            </label>
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Escanea o descarga este código QR desde tu aplicación bancaria móvil para realizar tu aporte..."
              className="w-full bg-slate-900 border border-slate-750 focus:border-amber-500 rounded-xl p-2.5 text-white font-medium text-xs focus:outline-none resize-none"
            />
          </div>

          {/* Submit Action Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-400 hover:from-amber-400 hover:to-teal-300 text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 transition cursor-pointer active:scale-[0.98] disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                <span>GUARDANDO CÓDIGO QR...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-black" />
                <span>GUARDAR CÓDIGO QR DE APÓYAME</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Real-time Live Preview */}
        <div className="md:col-span-5 bg-[#050811] rounded-2xl p-4 border border-slate-800 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Vista Previa del Modal de Apoyo</span>
          </span>

          <div className="p-2.5 bg-white rounded-xl shadow-lg border-2 border-amber-400/30 max-w-[200px] relative">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Vista previa del QR"
                className="w-44 h-44 object-contain rounded-lg"
              />
            ) : (
              <div className="w-44 h-44 bg-slate-100 rounded-lg flex flex-col items-center justify-center text-slate-400 p-2">
                <QrCode className="w-12 h-12 text-slate-300 mb-1" />
                <span className="text-[10px] text-slate-600 font-bold">Sin QR subido</span>
                <span className="text-[9px] text-slate-400">Sube una imagen para verla aquí</span>
              </div>
            )}
            <div className="mt-1 px-2 py-0.5 rounded-full bg-emerald-600 text-black font-black text-[8px] tracking-wider uppercase shadow-sm inline-flex items-center gap-0.5">
              <ShieldCheck className="w-2.5 h-2.5 text-black" />
              <span>QR SIMPLE BOLIVIA</span>
            </div>
          </div>

          <div className="mt-3 space-y-1.5 w-full max-w-[240px]">
            <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 italic">
              {instructions}
            </div>
            <span className="text-[9px] text-emerald-400/80 font-mono block">
              ✓ Banco y Titular ocultados
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
