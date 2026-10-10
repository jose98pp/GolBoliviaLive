import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileText,
  Image as ImageIcon,
  RefreshCw,
  Heart,
  ShieldCheck,
  Lock,
  Database,
  Eye,
  Radio,
} from 'lucide-react';
import { DonationQrInfo } from '../types/football';
import { apiClient } from '../services/apiClient';
import {
  saveDonationQrToFirebase,
  getDonationQrFromFirebase,
  subscribeDonationQrFirebase,
} from '../services/firebase';
import { DonationQrModal } from './DonationQrModal';

/**
 * Optimiza y redimensiona cualquier imagen (File o base64) a un tamaño óptimo
 * para códigos QR (máximo 800x800px, JPEG 88%), reduciendo el peso de varios MB a solo ~40KB - 90KB.
 * Previene el error HTTP 413 (Payload Too Large) y el límite de 1MB de Firestore.
 */
async function optimizeQrImage(
  source: File | string,
  maxDimension = 800,
  quality = 0.88
): Promise<{ dataUrl: string; sizeKb: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const processImage = (src: string) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onerror = () => reject(new Error('No se pudo procesar la imagen del código QR.'));
      img.onload = () => {
        let width = img.naturalWidth || img.width || 800;
        let height = img.naturalHeight || img.height || 800;

        // Si ya es liviana y de tamaño razonable, no recomprimir
        if (width <= maxDimension && height <= maxDimension && src.length < 120000) {
          const approxKb = Math.round((src.length * 0.75) / 1024);
          return resolve({ dataUrl: src, sizeKb: approxKb, width, height });
        }

        // Redimensionar proporcionalmente a maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const approxKb = Math.round((src.length * 0.75) / 1024);
          return resolve({ dataUrl: src, sizeKb: approxKb, width, height });
        }

        // Fondo blanco nítido para máximo contraste de escaneo QR
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a JPEG optimizado
        const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
        const approxBytes = Math.round(optimizedDataUrl.length * 0.75);
        const sizeKb = Math.round(approxBytes / 1024);

        resolve({ dataUrl: optimizedDataUrl, sizeKb, width, height });
      };
      img.src = src;
    };

    if (typeof source === 'string') {
      processImage(source);
    } else {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen.'));
      reader.onload = (e) => {
        const result = e.target?.result as string;
        processImage(result);
      };
      reader.readAsDataURL(source);
    }
  });
}

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
    initialQr?.instructions ||
      'Escanea o descarga este código QR desde tu aplicación bancaria móvil para realizar tu aporte.'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isFirebaseSynced, setIsFirebaseSynced] = useState(true);
  const [lastSavedTime, setLastSavedTime] = useState<number | null>(initialQr?.updatedAt || null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDirtyRef = useRef<boolean>(false);

  // 1. Cargar datos iniciales desde Firebase Firestore si están disponibles
  useEffect(() => {
    let isMounted = true;
    getDonationQrFromFirebase().then((fbQr) => {
      if (!isMounted) return;
      if (fbQr && fbQr.imageUrl && !isDirtyRef.current) {
        setImageUrl(fbQr.imageUrl);
        if (fbQr.instructions) setInstructions(fbQr.instructions);
        setLastSavedTime(fbQr.updatedAt || Date.now());
        setIsFirebaseSynced(true);
        onQrUpdated?.(fbQr);
      }
    }).catch(() => {});

    // Suscribirse en tiempo real a Firebase Firestore
    const unsubscribe = subscribeDonationQrFirebase((liveQr) => {
      if (!isMounted) return;
      // Sólo actualizar si el usuario no tiene cambios sin guardar en pantalla
      if (!isDirtyRef.current && liveQr) {
        if (liveQr.imageUrl !== undefined) setImageUrl(liveQr.imageUrl);
        if (liveQr.instructions) setInstructions(liveQr.instructions);
        setLastSavedTime(liveQr.updatedAt || Date.now());
        setIsFirebaseSynced(true);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // 2. Sincronizar props sólo cuando el usuario no está editando activamente
  useEffect(() => {
    if (initialQr && !isDirtyRef.current) {
      if (initialQr.imageUrl !== undefined && !imageUrl) {
        setImageUrl(initialQr.imageUrl);
      }
      if (initialQr.instructions && instructions === 'Escanea o descarga este código QR desde tu aplicación bancaria móvil para realizar tu aporte.') {
        setInstructions(initialQr.instructions);
      }
      if (initialQr.updatedAt) {
        setLastSavedTime(initialQr.updatedAt);
      }
    }
  }, [initialQr]);

  const [imageStats, setImageStats] = useState<{ sizeKb?: number; dimensions?: string } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMsg({
        type: 'error',
        text: 'El archivo seleccionado debe ser una imagen válida (PNG, JPG, SVG o WEBP).',
      });
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setStatusMsg({
        type: 'error',
        text: 'La imagen excede el límite de 15MB. Por favor sube una imagen de menor tamaño.',
      });
      return;
    }

    setStatusMsg({
      type: 'ok',
      text: '⚡ Optimizando código QR para guardado ultraliviano sin error 413...',
    });

    try {
      const optimized = await optimizeQrImage(file, 800, 0.88);
      setImageUrl(optimized.dataUrl);
      setImageStats({ sizeKb: optimized.sizeKb, dimensions: `${optimized.width}x${optimized.height}` });
      isDirtyRef.current = true;
      setStatusMsg({
        type: 'ok',
        text: `✅ Imagen QR optimizada con éxito (${optimized.sizeKb} KB, ${optimized.width}x${optimized.height} px). Presiona «GUARDAR CÓDIGO QR EN FIREBASE» para aplicar los cambios sin error 413.`,
      });
      setTimeout(() => setStatusMsg(null), 8000);
    } catch (err: any) {
      console.warn('[DonationQR] Error optimizando canvas, usando carga estándar:', err);
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setImageUrl(result);
        const approxKb = Math.round((result.length * 0.75) / 1024);
        setImageStats({ sizeKb: approxKb });
        isDirtyRef.current = true;
        setStatusMsg({
          type: 'ok',
          text: 'Imagen cargada en vista previa. Presiona «GUARDAR CÓDIGO QR EN FIREBASE» para aplicar los cambios permanentemente.',
        });
        setTimeout(() => setStatusMsg(null), 7000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMsg(null);
    try {
      let cleanImage = imageUrl.trim();
      const cleanInstructions = instructions.trim();
      const now = Date.now();

      // Si la imagen en base64 es mayor a 120KB, optimizarla antes de guardar para asegurar < 1MB en Firestore y Vercel
      if (cleanImage.startsWith('data:image/') && cleanImage.length > 150000) {
        try {
          const optimized = await optimizeQrImage(cleanImage, 800, 0.88);
          cleanImage = optimized.dataUrl;
          setImageUrl(cleanImage);
          setImageStats({ sizeKb: optimized.sizeKb, dimensions: `${optimized.width}x${optimized.height}` });
        } catch {
          // Continuar con la imagen actual si la re-optimización falla
        }
      }

      const payload: DonationQrInfo = {
        imageUrl: cleanImage,
        instructions: cleanInstructions,
        updatedAt: now,
      };

      // 1. Guardar de forma autoritativa en Google Firebase Firestore
      await saveDonationQrToFirebase(payload);

      // 2. Sincronizar simultáneamente con el servidor backend y difusión en vivo
      const res = await apiClient.saveDonationQr(payload);
      const savedResult = res.donationQr || payload;

      isDirtyRef.current = false;
      setLastSavedTime(now);
      setIsFirebaseSynced(true);

      setStatusMsg({
        type: 'ok',
        text: '✅ ¡Guardado con éxito! El código QR ha sido registrado en Google Firebase Firestore y está activo de inmediato en el botón «Apóyame».',
      });

      onQrUpdated?.(savedResult);
      setTimeout(() => setStatusMsg(null), 8000);
    } catch (err: any) {
      console.error('[DonationQR] Error al guardar:', err);
      setStatusMsg({
        type: 'error',
        text: `❌ Error al guardar: ${err.message || 'Error de red o permisos.'}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPreview = () => {
    if (!imageUrl) return;
    try {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = 'QR-GolBolivia-Admin.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <div
      id="seccion-qr-apoyame"
      className="bg-[#0a0f1d] border border-amber-500/30 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden"
    >
      {/* Glow ambient background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
            <Heart className="w-6 h-6 fill-rose-500 text-rose-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-white font-display uppercase tracking-wide">
                Configuración del Código QR (Botón «Apóyame»)
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                PESTAÑA 6 DEDICADA
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Database className="w-3 h-3 text-amber-400" />
                <span>FIREBASE FIRESTORE</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Administración oficial de la imagen QR y mensajes de donación para los hinchas que presionen el botón «Apóyame».
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {imageUrl && (
            <button
              type="button"
              onClick={handleDownloadPreview}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-750 transition cursor-pointer"
              title="Descargar imagen del QR actual"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Descargar</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsTestModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500/20 to-amber-500/20 hover:from-rose-500/30 hover:to-amber-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="Abrir vista previa interactiva del modal tal como lo verá el hincha"
          >
            <Eye className="w-3.5 h-3.5 text-rose-400" />
            <span>Ver como Hincha</span>
          </button>
        </div>
      </div>

      {/* Persistence & Privacy Info Badges */}
      <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Google Firebase Firestore:</strong> Persistencia en la nube activa. Todos los cambios se guardan permanentemente.
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs text-slate-300">
          <Lock className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Privacidad Protegida:</strong> El banco y titular fueron retirados. Los hinchas sólo ven el código QR limpio e instrucciones.
          </span>
        </div>
      </div>

      {/* Status banner */}
      {statusMsg && (
        <div
          className={`mt-3.5 p-3.5 rounded-xl text-xs font-medium flex items-center gap-2.5 animate-fadeIn shadow-lg ${
            statusMsg.type === 'ok'
              ? 'bg-emerald-950/90 text-emerald-200 border border-emerald-500/50 shadow-emerald-950/30'
              : 'bg-red-950/90 text-red-200 border border-red-500/50 shadow-red-950/30'
          }`}
        >
          {statusMsg.type === 'ok' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span className="flex-1">{statusMsg.text}</span>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Form & Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5">
        {/* Left Column: Form Fields */}
        <div className="lg:col-span-7 space-y-4">
          {/* File Upload Trigger */}
          <div className="bg-[#070b14] p-3.5 rounded-xl border border-slate-800">
            <label className="block text-xs font-bold text-white mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>Subir Imagen del Código QR:</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">PNG / JPG / WEBP / SVG</span>
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
                className="flex-1 py-3 px-3.5 rounded-xl bg-slate-850 hover:bg-slate-800 border-2 border-dashed border-amber-500/40 hover:border-amber-400 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-inner"
              >
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span>{imageUrl ? 'Cambiar Imagen de QR' : 'Seleccionar Archivo de Imagen del QR'}</span>
              </button>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl('');
                    isDirtyRef.current = true;
                  }}
                  className="px-3.5 py-3 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-semibold cursor-pointer transition"
                  title="Eliminar QR actual"
                >
                  Quitar
                </button>
              )}
            </div>
            <span className="text-[11px] text-slate-400 mt-2 block">
              💡 <strong>Tip:</strong> Puedes subir una captura de pantalla de tu QR Simple o transferencias bancarias de cualquier banco de Bolivia.
            </span>
          </div>

          {/* Direct URL input (alternative) */}
          <div className="bg-[#070b14] p-3.5 rounded-xl border border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>O ingresar enlace web directo (URL):</span>
              <span className="text-[10px] text-slate-500 font-mono">HTTPS</span>
            </label>
            <input
              type="text"
              value={imageUrl.startsWith('data:') ? '(Imagen en Base64 cargada desde archivo local)' : imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                isDirtyRef.current = true;
              }}
              placeholder="https://.../mi-codigo-qr.png"
              className="w-full bg-slate-900 border border-slate-750 focus:border-amber-500 rounded-xl p-2.5 text-white font-mono text-xs focus:outline-none transition-colors"
            />
          </div>

          {/* Instructions for fans */}
          <div className="bg-[#070b14] p-3.5 rounded-xl border border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Instrucciones que leerá el hincha:</span>
              </span>
              <span className="text-[10px] text-slate-500">{instructions.length}/300</span>
            </label>
            <textarea
              rows={2}
              maxLength={300}
              value={instructions}
              onChange={(e) => {
                setInstructions(e.target.value);
                isDirtyRef.current = true;
              }}
              placeholder="Escanea o descarga este código QR desde tu aplicación bancaria móvil para realizar tu aporte..."
              className="w-full bg-slate-900 border border-slate-750 focus:border-amber-500 rounded-xl p-2.5 text-white font-medium text-xs focus:outline-none resize-none transition-colors"
            />
          </div>

          {/* Action Button: Guardar en Firebase */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-400 hover:from-amber-400 hover:to-teal-300 text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-amber-950/40 transition cursor-pointer active:scale-[0.98] disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>GUARDANDO EN GOOGLE FIREBASE FIRESTORE...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 text-black" />
                  <span>GUARDAR CÓDIGO QR EN FIREBASE</span>
                </>
              )}
            </button>
            {lastSavedTime && (
              <span className="text-[10px] text-slate-500 font-mono block text-center mt-2">
                Última sincronización confirmada: {new Date(lastSavedTime).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Live Interactive Preview */}
        <div className="lg:col-span-5 bg-[#050811] rounded-2xl p-5 border border-slate-800 flex flex-col items-center justify-between text-center relative overflow-hidden">
          <div className="w-full">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Vista Previa del Modal «Apóyame»</span>
            </span>

            <div className="p-3 bg-white rounded-2xl shadow-2xl border-2 border-amber-400/40 max-w-[220px] mx-auto relative my-2">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Vista previa del QR"
                  className="w-48 h-48 object-contain rounded-xl mx-auto"
                />
              ) : (
                <div className="w-48 h-48 bg-slate-100 rounded-xl flex flex-col items-center justify-center text-slate-400 p-2">
                  <QrCode className="w-14 h-14 text-slate-300 mb-1.5" />
                  <span className="text-xs text-slate-700 font-bold">Sin QR personalizado</span>
                  <span className="text-[10px] text-slate-500 mt-1">Sube una imagen para activarlo</span>
                </div>
              )}
              <div className="mt-1.5 px-2.5 py-0.5 rounded-full bg-emerald-600 text-black font-black text-[9px] tracking-wider uppercase shadow-md inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-black" />
                <span>QR SIMPLE BOLIVIA</span>
              </div>
              {imageStats?.sizeKb && (
                <div className="mt-1.5 px-2 py-0.5 rounded-md bg-slate-900 border border-emerald-500/40 text-[9px] font-mono text-emerald-400 font-semibold flex items-center justify-center gap-1">
                  <span>⚡ Peso: {imageStats.sizeKb} KB</span>
                  {imageStats.dimensions && <span>({imageStats.dimensions})</span>}
                  <span>• Ligero</span>
                </div>
              )}
            </div>

            <div className="mt-3.5 space-y-2 w-full max-w-[260px] mx-auto text-left">
              <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-0.5">
                  Mensaje al donante:
                </span>
                {instructions}
              </div>
              <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-[10px] text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>Datos bancarios ocultos por privacidad</span>
              </div>
            </div>
          </div>

          <div className="w-full pt-4 mt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setIsTestModalOpen(true)}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>Abrir Simulación en Pantalla Completa</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal interactivo de prueba */}
      <DonationQrModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        donationQr={{
          imageUrl,
          instructions,
          updatedAt: lastSavedTime || Date.now(),
        }}
      />
    </div>
  );
};

