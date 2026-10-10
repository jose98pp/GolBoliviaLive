import React, { useState } from 'react';
import { Heart, Download, X, QrCode, Check, Copy, ShieldCheck, Sparkles } from 'lucide-react';
import { DonationQrInfo } from '../types/football';

interface DonationQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  donationQr?: DonationQrInfo;
}

// Default SVG QR for demonstration when admin hasn't uploaded a custom QR yet
const DEFAULT_DEMO_QR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="200" height="200" fill="white"/><rect x="20" y="20" width="50" height="50" fill="black"/><rect x="30" y="30" width="30" height="30" fill="white"/><rect x="38" y="38" width="14" height="14" fill="black"/><rect x="130" y="20" width="50" height="50" fill="black"/><rect x="140" y="30" width="30" height="30" fill="white"/><rect x="148" y="38" width="14" height="14" fill="black"/><rect x="20" y="130" width="50" height="50" fill="black"/><rect x="30" y="140" width="30" height="30" fill="white"/><rect x="38" y="148" width="14" height="14" fill="black"/><rect x="85" y="25" width="10" height="10" fill="black"/><rect x="105" y="25" width="10" height="20" fill="black"/><rect x="85" y="55" width="20" height="10" fill="black"/><rect x="25" y="85" width="10" height="20" fill="black"/><rect x="55" y="95" width="20" height="10" fill="black"/><rect x="85" y="85" width="30" height="30" fill="black"/><rect x="95" y="95" width="10" height="10" fill="white"/><rect x="135" y="85" width="20" height="20" fill="black"/><rect x="165" y="105" width="15" height="15" fill="black"/><rect x="85" y="135" width="20" height="10" fill="black"/><rect x="105" y="155" width="30" height="15" fill="black"/><rect x="145" y="135" width="35" height="15" fill="black"/><rect x="155" y="165" width="25" height="15" fill="black"/><text x="100" y="195" font-family="sans-serif" font-size="9" font-weight="bold" text-anchor="middle" fill="%23047857">QR SIMPLE BOLIVIA</text></svg>`;

export const DonationQrModal: React.FC<DonationQrModalProps> = ({
  isOpen,
  onClose,
  donationQr,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const qrImageUrl = donationQr?.imageUrl?.trim() || DEFAULT_DEMO_QR;
  const instructions = donationQr?.instructions?.trim() || 'Escanea o descarga este código QR desde tu app bancaria móvil de Bolivia para transferir tu aporte.';

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = qrImageUrl;
      link.download = `QR-Apoyo-GolBolivia.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(qrImageUrl, '_blank');
    }
  };

  const handleCopyDetails = () => {
    navigator.clipboard?.writeText(instructions).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-gradient-to-b from-[#0e1628] to-[#070c17] rounded-3xl border border-amber-500/30 shadow-2xl shadow-amber-950/40 p-5 sm:p-6 text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background effects */}
        <div className="absolute -top-20 -right-20 w-44 h-44 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-700"
          title="Cerrar modal"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-4 sm:mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-500/40 text-amber-400 mb-2.5 shadow-lg shadow-amber-950/40">
            <Heart className="w-6 h-6 fill-rose-500 text-rose-400 animate-pulse" />
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white font-display tracking-tight flex items-center justify-center gap-1.5">
            <span>¡Apoya la Transmisión!</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Tu apoyo permite mantener los servidores, túneles Cloudflare y la señal HD gratis para toda la hinchada.
          </p>
        </div>

        {/* QR Display Card */}
        <div className="bg-[#050811] rounded-2xl p-4 border border-slate-800 shadow-inner flex flex-col items-center">
          <div className="relative p-2.5 bg-white rounded-xl shadow-lg border-2 border-amber-400/30">
            <img
              src={qrImageUrl}
              alt="Código QR de Pago / Donación"
              className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-lg"
            />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-emerald-600 text-black font-black text-[9px] tracking-wider uppercase shadow-md flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-black" />
              <span>QR SIMPLE BOLIVIA</span>
            </div>
          </div>

          {/* Download Action Button */}
          <button
            onClick={handleDownload}
            className="mt-4 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>DESCARGAR QR PARA PAGAR</span>
          </button>
        </div>

        {/* Instructions only - Banco y Titular removidos */}
        <div className="mt-3.5 space-y-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2.5">
            <span className="text-[11px] text-slate-300 leading-relaxed">{instructions}</span>
            <button
              onClick={handleCopyDetails}
              className="text-[10px] text-amber-400 hover:text-amber-300 font-mono font-bold flex items-center gap-1 shrink-0 cursor-pointer"
              title="Copiar instrucciones"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Thank You Note */}
        <div className="mt-3 text-center">
          <span className="text-[10px] text-slate-500 font-medium">
            ¡Muchas gracias por apoyar el fútbol boliviano independiente! 🇧🇴⚽
          </span>
        </div>
      </div>
    </div>
  );
};
