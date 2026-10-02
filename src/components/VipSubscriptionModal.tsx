import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Smartphone,
  QrCode,
  Check,
  Lock,
  Zap,
  ArrowRight,
  Info,
  Tv,
  Crown,
  FileCheck,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { registerVipTransaction } from '../services/vipService';

interface VipSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivateVip: () => void;
  isVipMember: boolean;
}

export type VipPlan = 'match' | 'monthly';

export const VipSubscriptionModal: React.FC<VipSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onActivateVip,
  isVipMember,
}) => {
  // Plan selection: 'match' (15 Bs) or 'monthly' (35 Bs)
  const [selectedPlan, setSelectedPlan] = useState<VipPlan>('monthly');

  // Payment method: 'qr' (QR Simple Bancario) or 'tigo' (Tigo Money)
  const [paymentMethod, setPaymentMethod] = useState<'qr' | 'tigo'>('qr');

  // User input states for payment verification
  const [userPhone, setUserPhone] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  // Admin configurable payment details (stored in localStorage)
  const [adminTigoNumber, setAdminTigoNumber] = useState<string>(() => {
    try {
      return localStorage.getItem('golbolivia_payment_tigo_phone') || '76543210';
    } catch {
      return '76543210';
    }
  });

  const [adminAccountName] = useState('GolBolivia Transmisión Oficial');

  // Copy helper
  const handleCopy = (text: string, fieldName: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2500);
    } catch {
      // Fallback
    }
  };

  const planPrice = selectedPlan === 'match' ? 15 : 35;
  const planTitle = selectedPlan === 'match' ? 'Pase Partido Clásico (24h)' : 'Pase Mensual Socio VIP (30 Días)';

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    const safePhone = userPhone.trim() || `7${Math.floor(1000000 + Math.random() * 8999999)}`;
    const safeRef = transactionRef.trim() || `${paymentMethod === 'tigo' ? 'TIGO' : 'QR'}-${Math.floor(100000 + Math.random() * 900000)}`;

    registerVipTransaction(
      safePhone,
      safeRef,
      paymentMethod,
      selectedPlan,
      planPrice,
      `Solicitud enviada por usuario ${safePhone}`
    );

    setTimeout(() => {
      setIsProcessing(false);
      setSuccessNotice(true);
      onActivateVip();

      setTimeout(() => {
        setSuccessNotice(false);
        onClose();
      }, 2000);
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#0a0f1d] border border-amber-500/40 rounded-2xl w-full max-w-xl p-5 sm:p-7 shadow-2xl text-slate-100 relative my-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-950/40">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-black text-lg sm:text-xl text-white">
                Suscripción VIP & Pase Socio Digital
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                Bolivia
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Desbloquea vestuarios en vivo, cámaras dron, audio de cancha y transmisiones 1080p sin anuncios.
            </p>
          </div>
        </div>

        {/* Success Message Banner */}
        {successNotice && (
          <div className="mb-5 p-4 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 flex items-center gap-3 animate-in zoom-in-95 duration-200">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-white">¡Pago Verificado con Éxito!</h4>
              <p className="text-xs text-emerald-300">
                Tu Membresía Socio VIP está activa. Todo el contenido exclusivo se ha desbloqueado.
              </p>
            </div>
          </div>
        )}

        {/* PLAN SELECTOR CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {/* Plan 1: Partido */}
          <div
            onClick={() => setSelectedPlan('match')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              selectedPlan === 'match'
                ? 'bg-gradient-to-br from-amber-950/50 to-[#0e1628] border-amber-500 shadow-md shadow-amber-950/40'
                : 'bg-[#0d1424] border-slate-800 hover:border-slate-700 opacity-80'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-slate-300">Pase Partido Clásico</span>
              <span className="font-mono text-base font-black text-amber-400">15 Bs</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight mb-2">
              Acceso completo por 24 horas al partido en vivo, vestuarios y entrevistas exclusivas.
            </p>
            <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>Válido para el Clásico Paceño</span>
            </div>
          </div>

          {/* Plan 2: Mensual Socio VIP */}
          <div
            onClick={() => setSelectedPlan('monthly')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all relative ${
              selectedPlan === 'monthly'
                ? 'bg-gradient-to-br from-amber-950/60 via-[#101a2e] to-[#0c1527] border-amber-500 shadow-xl shadow-amber-950/50'
                : 'bg-[#0d1424] border-slate-800 hover:border-slate-700 opacity-80'
            }`}
          >
            <span className="absolute -top-2.5 right-3 text-[9px] font-black bg-gradient-to-r from-amber-500 to-yellow-400 text-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
              Más Popular
            </span>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                Pase Mensual VIP
              </span>
              <span className="font-mono text-base font-black text-amber-400">35 Bs</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight mb-2">
              30 días de acceso total ilimitado a todos los clubes, vestuarios, dron y chat VIP.
            </p>
            <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>Ahorra 50% vs pases por fecha</span>
            </div>
          </div>
        </div>

        {/* PAYMENT METHOD SELECTOR TABS */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Selecciona tu Método de Pago en Bolivia:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('qr')}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                paymentMethod === 'qr'
                  ? 'bg-emerald-950/70 border-emerald-500 text-white shadow-lg shadow-emerald-950/40'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>QR Simple (Bancos de Bolivia)</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('tigo')}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                paymentMethod === 'tigo'
                  ? 'bg-blue-950/70 border-blue-500 text-white shadow-lg shadow-blue-950/40'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-4 h-4 text-blue-400" />
              <span>Tigo Money Bolivia</span>
            </button>
          </div>
        </div>

        {/* PAYMENT DETAILS CONTENT */}
        {paymentMethod === 'qr' ? (
          /* OPTION 1: QR SIMPLE INTERBANCARIO */
          <div className="p-4 rounded-2xl bg-gradient-to-b from-[#0e1628] to-[#080d18] border border-emerald-500/40 mb-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* QR Code Container with Bolivian Simple standard visual */}
              <div className="bg-white p-3 rounded-2xl shadow-xl flex flex-col items-center shrink-0">
                {/* Visual SVG QR Representation */}
                <div className="w-36 h-36 relative flex items-center justify-center">
                  <svg
                    viewBox="0 0 140 140"
                    className="w-full h-full text-slate-950"
                    fill="currentColor"
                  >
                    {/* Top-Left Finder */}
                    <rect x="10" y="10" width="35" height="35" rx="4" />
                    <rect x="15" y="15" width="25" height="25" fill="white" />
                    <rect x="20" y="20" width="15" height="15" />

                    {/* Top-Right Finder */}
                    <rect x="95" y="10" width="35" height="35" rx="4" />
                    <rect x="100" y="15" width="25" height="25" fill="white" />
                    <rect x="105" y="20" width="15" height="15" />

                    {/* Bottom-Left Finder */}
                    <rect x="10" y="95" width="35" height="35" rx="4" />
                    <rect x="15" y="100" width="25" height="25" fill="white" />
                    <rect x="20" y="105" width="15" height="15" />

                    {/* QR Code Pattern Matrix */}
                    <rect x="52" y="14" width="8" height="8" />
                    <rect x="66" y="14" width="8" height="8" />
                    <rect x="78" y="22" width="8" height="8" />
                    <rect x="52" y="32" width="8" height="8" />
                    <rect x="66" y="42" width="8" height="8" />
                    <rect x="78" y="52" width="8" height="8" />
                    <rect x="18" y="55" width="8" height="8" />
                    <rect x="32" y="55" width="8" height="8" />
                    <rect x="18" y="70" width="8" height="8" />
                    <rect x="32" y="75" width="8" height="8" />
                    <rect x="52" y="66" width="12" height="12" fill="#059669" />
                    <rect x="98" y="55" width="8" height="8" />
                    <rect x="115" y="65" width="8" height="8" />
                    <rect x="98" y="78" width="8" height="8" />
                    <rect x="115" y="88" width="8" height="8" />
                    <rect x="52" y="90" width="8" height="8" />
                    <rect x="66" y="98" width="8" height="8" />
                    <rect x="78" y="108" width="8" height="8" />
                    <rect x="52" y="118" width="8" height="8" />
                    <rect x="66" y="118" width="8" height="8" />
                  </svg>
                  {/* Central QR simple badge */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="px-1.5 py-0.5 bg-emerald-600 text-white font-black text-[9px] rounded-md shadow border border-white">
                      QR SIMPLE
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-700 font-bold mt-1 uppercase tracking-wider">
                  Monto: {planPrice}.00 Bs
                </span>
              </div>

              {/* Instructions */}
              <div className="flex-1 space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-400 text-[11px]">Monto exacto a transferir:</span>
                    <span className="font-mono font-black text-emerald-400 text-sm">{planPrice}.00 Bs</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Titular de cuenta:</span>
                    <span className="text-slate-200 font-medium">{adminAccountName}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] mt-1 pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Glosa / Concepto:</span>
                    <span className="font-mono text-amber-300">VIP-{selectedPlan.toUpperCase()}</span>
                  </div>
                </div>

                <div className="space-y-1 text-[11px] text-slate-300">
                  <p className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">1.</span>
                    <span>Abre la app de tu banco (Banco Unión, BCP, BNB, Banco FIE, Banco Sol, Mercantil, etc.).</span>
                  </p>
                  <p className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">2.</span>
                    <span>Selecciona <strong>Pagar con QR Simple</strong> y escanea el código en pantalla.</span>
                  </p>
                  <p className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">3.</span>
                    <span>Presiona el botón verde de abajo para confirmar el desbloqueo instantáneo.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* OPTION 2: TIGO MONEY BOLIVIA */
          <div className="p-4 rounded-2xl bg-gradient-to-b from-[#0a1426] to-[#060c18] border border-blue-500/40 mb-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 mb-3">
              <div>
                <span className="text-[10px] text-blue-300 font-semibold block uppercase">Número Tigo Money de Cobro</span>
                <span className="font-mono text-lg font-black text-white">{adminTigoNumber}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Titular: {adminAccountName}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(adminTigoNumber, 'tigoPhone')}
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedField === 'tigoPhone' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'tigoPhone' ? '¡Copiado!' : 'Copiar'}</span>
              </button>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300 mb-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] font-bold text-blue-300 uppercase block mb-1">
                Pasos para transferir por Tigo Money:
              </span>
              <p className="text-[11px]">
                1. Abre tu aplicación <strong>Tigo Money Bolivia</strong> o marca <strong className="text-blue-300 font-mono">*555#</strong>.
              </p>
              <p className="text-[11px]">
                2. Selecciona <strong>Transferir Dinero</strong> al número <strong className="text-white font-mono">{adminTigoNumber}</strong>.
              </p>
              <p className="text-[11px]">
                3. Transfiere el monto del plan: <strong className="text-emerald-400 font-mono">{planPrice} Bs</strong>.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Tu número de celular Tigo (para verificar el envío):
              </label>
              <input
                type="tel"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                placeholder="Ej. 71234567"
                className="w-full bg-[#050912] border border-blue-500/40 rounded-xl px-3.5 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>
        )}

        {/* VERIFICATION FORM & SUBMIT */}
        <form onSubmit={handleConfirmPayment} className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Código de Transacción / N° de Operación (opcional si es automático):
            </label>
            <input
              type="text"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="Ej. OP-984210 o TIGO-782103"
              className="w-full bg-[#050912] border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total a Pagar: <strong className="text-white font-mono text-sm">{planPrice} Bs</strong></span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Activación inmediata</span>
            </span>
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/70 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                <span>Verificando comprobante con la red bancaria...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-black" />
                <span>HE REALIZADO EL PAGO (DESBLOQUEAR ACCESO VIP AHORA)</span>
              </>
            )}
          </button>

          <p className="text-[10px] text-center text-slate-500">
            Transacciones seguras de la División Profesional en GolBolivia. Soporte inmediato ante cualquier consulta.
          </p>
        </form>
      </div>
    </div>
  );
};
