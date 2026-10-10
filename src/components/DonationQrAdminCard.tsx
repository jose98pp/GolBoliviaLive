import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Upload, Download, CheckCircle2, AlertCircle, Sparkles, Building2, User, FileText, Image, RefreshCw, Heart } from 'lucide-react';
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
  const [bankName, setBankName] = useState<string>(
    initialQr?.bankName || 'Cualquier Banco de Bolivia (QR Simple / BNB / Unión / BCP)'
  );
  const [accountHolder, setAccountHolder] = useState<string>(
    initialQr?.accountHolder || 'GolBolivia Live Streaming'
  );
  const [instructions, setInstructions] = useState<string>(
    initialQr?.instructions || 'Escanea o descarga este código QR desde tu aplicación bancaria móvil para realizar tu aporte.'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialQr) {
      if (initialQr.imageUrl !== undefined) setImageUrl(initialQr.imageUrl);
      if (initialQr.bankName) setBankName(initialQr.bankName);
      if (initialQr.accountHolder) setAccountHolder(initialQr.accountHolder);
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
      setStatusMsg({ type: 'ok', text: 'Imagen cargada en vista previa. Recuerda presionar «GUARDAR CÓDIGO QR».' });
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
        bankName: bankName.trim(),
        accountHolder: accountHolder.trim(),
        instructions: instructions.trim(),
        updatedAt: Date.now(),
      };

      const res = await apiClient.saveDonationQr(payload);
      setStatusMsg({ type: 'ok', text: '✅ Código QR y datos de donación guardados y sincronizados con éxito para todos los hinchas.' });
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
    <div className="bg-[#0a0f1d] border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
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
                Apóyame · Gestión del Código QR de Donaciones
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                PÚBLICO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Sube el código QR bancario que los hinchas verán y descargarán al presionar el botón «Apóyame».
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
        <div className="md:col-span-7 space-y-3.5">
          {/* File Upload Trigger */}
          <div>
            <label className="block text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Subir Archivo de Imagen QR:</span>
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
                className="flex-1 py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-dashed border-amber-500/50 hover:border-amber-400 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Image className="w-4 h-4 text-amber-400" />
                <span>{imageUrl ? 'Cambiar Imagen de QR' : 'Seleccionar Imagen desde Dispositivo (PNG / JPG / SVG)'}</span>
              </button>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="px-3 py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-semibold cursor-pointer transition"
                  title="Eliminar QR actual"
                >
                  Limpiar
                </button>
              )}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Formatos recomendados: PNG o JPG cuadrado (mínimo 300x300 px). Máx. 3 MB.
            </span>
          </div>

          {/* Direct URL input (optional alternative) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              O pegar URL directa de la imagen:
            </label>
            <input
              type="text"
              value={imageUrl.startsWith('data:') ? '(Imagen en Base64 cargada)' : imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://.../mi-qr-donaciones.png"
              className="w-full bg-slate-900 border border-slate-750 focus:border-amber-500 rounded-xl p-2.5 text-white font-mono text-xs focus:outline-none"
            />
          </div>

          {/* Bank / Wallet Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Banco / Billetera / Plataforma:</span>
            </label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Ej: Banco Nacional de Bolivia (BNB) / Banco Unión / QR Simple"
              className="w-full bg-slate-900 border border-slate-750 focus:border-emerald-500 rounded-xl p-2.5 text-white font-medium text-xs focus:outline-none"
            />
          </div>

          {/* Account Holder */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-400" />
              <span>Titular de la Cuenta o Nombre de Receptor:</span>
            </label>
            <input
              type="text"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="Ej: GolBolivia Live Transmisiones"
              className="w-full bg-slate-900 border border-slate-750 focus:border-sky-500 rounded-xl p-2.5 text-white font-medium text-xs focus:outline-none"
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
              placeholder="Instrucciones para transferir desde aplicaciones móviles..."
              className="w-full bg-slate-900 border border-slate-750 focus:border-amber-500 rounded-xl p-2 text-white font-medium text-xs focus:outline-none resize-none"
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
                <span>GUARDAR CÓDIGO QR DE DONACIONES</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Real-time Live Preview */}
        <div className="md:col-span-5 bg-[#050811] rounded-2xl p-4 border border-slate-800 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Vista Previa del Hincha</span>
          </span>

          <div className="p-2.5 bg-white rounded-xl shadow-lg border-2 border-amber-400/30 max-w-[190px]">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Vista previa del QR"
                className="w-40 h-40 object-contain rounded-lg"
              />
            ) : (
              <div className="w-40 h-40 bg-slate-100 rounded-lg flex flex-col items-center justify-center text-slate-400 p-2">
                <QrCode className="w-12 h-12 text-slate-300 mb-1" />
                <span className="text-[10px] text-slate-500 font-bold">Sin QR subido</span>
                <span className="text-[9px] text-slate-400">Sube una imagen para verla aquí</span>
              </div>
            )}
          </div>

          <div className="mt-3 space-y-1 w-full max-w-[220px]">
            <span className="text-xs font-bold text-white block truncate">
              {accountHolder || 'Titular no especificado'}
            </span>
            <span className="text-[10px] text-amber-400 font-mono block truncate">
              {bankName || 'Banco no especificado'}
            </span>
            <p className="text-[9px] text-slate-500 italic line-clamp-2">
              {instructions}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
