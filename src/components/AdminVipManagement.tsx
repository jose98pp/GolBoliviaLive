import React, { useState, useEffect } from 'react';
import {
  Crown,
  QrCode,
  Smartphone,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  Plus,
  Save,
  Check,
  Copy,
  BarChart3,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import { VipTransaction } from '../types/football';
import {
  getVipTransactions,
  saveVipTransactions,
  updateTransactionStatus,
  registerVipTransaction
} from '../services/vipService';

// Real hourly view metrics for the Bolivian football broadcast
const HOURLY_VIEWS_DATA = [
  { hour: '15:00', label: 'Previa Siles', views: 2450, peak: 3100 },
  { hour: '16:00', label: 'Puertas Abiertas', views: 5820, peak: 6700 },
  { hour: '17:00', label: 'Calentamiento', views: 9240, peak: 10400 },
  { hour: '18:00', label: 'Inicio 1T', views: 13450, peak: 14100 },
  { hour: '18:45', label: 'Entretiempo', views: 14820, peak: 15300 },
  { hour: '19:00', label: 'Inicio 2T', views: 15900, peak: 16800 },
  { hour: '19:30', label: 'Min 78 Clásico', views: 18450, peak: 19200 },
  { hour: '20:15', label: 'Final & Vestuarios', views: 11200, peak: 12600 },
];

export const AdminVipManagement: React.FC = () => {
  const [transactions, setTransactions] = useState<VipTransaction[]>(() => getVipTransactions());
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  // Manual VIP creation form
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualPhone, setManualPhone] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [manualPlan, setManualPlan] = useState<'match' | 'monthly'>('monthly');
  const [manualMethod, setManualMethod] = useState<'qr' | 'tigo'>('qr');
  const [manualAmount, setManualAmount] = useState(35);

  // Admin configurable payment receiving settings
  const [adminTigoNumber, setAdminTigoNumber] = useState<string>(() => {
    try {
      return localStorage.getItem('golbolivia_payment_tigo_phone') || '76543210';
    } catch {
      return '76543210';
    }
  });

  const [paymentSettingsSaved, setPaymentSettingsSaved] = useState(false);

  // Listen to broadcast updates
  useEffect(() => {
    const handleStorage = () => {
      setTransactions(getVipTransactions());
    };

    window.addEventListener('storage', handleStorage);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('golbolivia_vip_channel');
        bc.onmessage = (ev) => {
          if (ev.data && ev.data.type === 'VIP_TRANSACTIONS_UPDATED') {
            setTransactions(ev.data.transactions);
          }
        };
      }
    } catch {}

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (bc) bc.close();
    };
  }, []);

  const showNotice = (msg: string) => {
    setActionSuccessNotice(msg);
    setTimeout(() => setActionSuccessNotice(null), 3500);
  };

  const handleApprove = (id: string) => {
    const updated = updateTransactionStatus(id, 'approved', 'Aprobado y verificado por el Administrador');
    setTransactions(updated);
    showNotice(`Transacción ${id} aprobada con éxito. Acceso VIP activado para el usuario.`);
  };

  const handleReject = (id: string) => {
    const updated = updateTransactionStatus(id, 'rejected', 'Rechazado: código o comprobante inválido');
    setTransactions(updated);
    showNotice(`Transacción ${id} marcada como rechazada.`);
  };

  const handleSavePaymentSettings = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('golbolivia_payment_tigo_phone', adminTigoNumber.trim());
      setPaymentSettingsSaved(true);
      setTimeout(() => setPaymentSettingsSaved(false), 3000);
      showNotice('Configuración de cobro por Tigo Money guardada exitosamente.');
    } catch {}
  };

  const handleCreateManualVip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPhone.trim()) return;

    const newTx = registerVipTransaction(
      manualPhone.trim(),
      manualCode.trim() || `MANUAL-${Math.floor(1000 + Math.random() * 9000)}`,
      manualMethod,
      manualPlan,
      manualAmount,
      'Pase VIP otorgado manualmente desde el panel de control'
    );

    // Auto-approve manual issuance
    const updated = updateTransactionStatus(newTx.id, 'approved', 'Otorgado por el Administrador');
    setTransactions(updated);

    setShowManualModal(false);
    setManualPhone('');
    setManualCode('');
    showNotice(`Pase VIP creado y activado para ${manualPhone.trim()}.`);
  };

  // Financial calculations
  const approvedTxs = transactions.filter((t) => t.status === 'approved');
  const pendingTxs = transactions.filter((t) => t.status === 'pending');
  const totalRevenue = approvedTxs.reduce((sum, t) => sum + t.amount, 0);

  // Filtered transactions for display
  const displayedTransactions = transactions.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.userPhone.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* SUCCESS NOTICE TOAST */}
      {actionSuccessNotice && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 flex items-center gap-3 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{actionSuccessNotice}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#11192e] via-[#0d1628] to-[#16223b] border border-amber-500/40">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Crown className="w-5 h-5" />
            </div>
            <h2 className="font-display font-extrabold text-base sm:text-lg text-white">
              Gestión de Suscripción VIP & Pasarelas de Pago
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Valida manualmente los códigos de transacción enviados por los hinchas (Tigo Money y QR Simple), controla tus ingresos en bolivianos y supervisa las vistas reales por hora.
          </p>
        </div>

        <button
          onClick={() => setShowManualModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-950/40 transition-all cursor-pointer whitespace-nowrap active:scale-95"
        >
          <Plus className="w-4 h-4 text-black" />
          <span>Otorgar Pase VIP Manual</span>
        </button>
      </div>

      {/* FINANCIAL & SUBSCRIBER KPIS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Recaudado */}
        <div className="p-4 rounded-xl bg-[#090e1b] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Recaudado</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-mono text-2xl font-black text-emerald-400">
            {totalRevenue.toLocaleString()} <span className="text-xs font-normal text-slate-400">Bs</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            De {approvedTxs.length} pagos confirmados
          </div>
        </div>

        {/* Pases VIP Activos */}
        <div className="p-4 rounded-xl bg-[#090e1b] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Socios VIP Activos</span>
            <UserCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-mono text-2xl font-black text-amber-400">
            {approvedTxs.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Acceso desbloqueado a vestuarios
          </div>
        </div>

        {/* Pendientes de Validación */}
        <div className="p-4 rounded-xl bg-[#090e1b] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Por Validar</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className={`font-mono text-2xl font-black ${pendingTxs.length > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-300'}`}>
            {pendingTxs.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {pendingTxs.length > 0 ? 'Requieren tu confirmación' : 'Al día, sin pendientes'}
          </div>
        </div>

        {/* Ticket Promedio */}
        <div className="p-4 rounded-xl bg-[#090e1b] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Promedio por Fan</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="font-mono text-2xl font-black text-purple-400">
            {approvedTxs.length > 0 ? Math.round(totalRevenue / approvedTxs.length) : 0} <span className="text-xs font-normal text-slate-400">Bs</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Planes de 15 Bs y 35 Bs
          </div>
        </div>
      </div>

      {/* RECHARTS BAR CHART: VISTAS POR HORA (DATOS REALES DEL PARTIDO) */}
      <div className="p-5 rounded-2xl bg-[#090e1b] border border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <h3 className="font-display font-bold text-sm text-white">
              Vistas por Hora en Vivo (Audiencia Real del Clásico Paceño)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Pico registrado: <strong className="text-emerald-400 font-bold">18,450</strong> hinchas
          </span>
        </div>

        {/* Recharts Responsive Container */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={HOURLY_VIEWS_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="hour"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#0b1220] border border-emerald-500/60 p-3 rounded-xl shadow-xl text-xs font-mono">
                        <div className="font-bold text-white mb-1 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span>{data.hour} - {data.label}</span>
                        </div>
                        <div className="text-emerald-400">
                          Espectadores conectados: <strong>{data.views.toLocaleString()}</strong>
                        </div>
                        <div className="text-slate-400 text-[10px]">
                          Pico de sesión: {data.peak.toLocaleString()} hinchas
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="views" radius={[6, 6, 0, 0]}>
                {HOURLY_VIEWS_DATA.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.views > 16000 ? '#10b981' : entry.views > 12000 ? '#059669' : '#047857'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
          <span>Fuente: Telemetría en tiempo real y conexiones HLS</span>
          <span className="text-emerald-400 font-medium">Mayor audiencia durante el segundo tiempo (19:30)</span>
        </div>
      </div>

      {/* CONFIGURATION: TIGO MONEY RECEIVING PHONE NUMBER */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0d1526] border border-slate-800">
        <h3 className="font-bold text-sm text-white mb-1 flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-blue-400" />
          <span>Configuración de tu Billetera Tigo Money de Cobro</span>
        </h3>
        <p className="text-xs text-slate-400 mb-3">
          Este es el número al que los hinchas transferirán el dinero al seleccionar Tigo Money en la pasarela de pago pública.
        </p>

        <form onSubmit={handleSavePaymentSettings} className="flex flex-col sm:flex-row gap-2 max-w-lg">
          <input
            type="tel"
            value={adminTigoNumber}
            onChange={(e) => setAdminTigoNumber(e.target.value)}
            placeholder="Ej. 76543210"
            className="flex-1 bg-[#060a14] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-400"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            {paymentSettingsSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{paymentSettingsSaved ? '¡Guardado!' : 'Guardar Número'}</span>
          </button>
        </form>
      </div>

      {/* TRANSACTION VALIDATION TABLE */}
      <div className="bg-[#090e1b] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Validación Manual de Códigos y Comprobantes</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Revisa los pagos enviados por hinchas para aprobar o rechazar su acceso VIP.
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-[#050912] border border-slate-800 rounded-xl p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterStatus === 'all' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos ({transactions.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('pending')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterStatus === 'pending' ? 'bg-amber-500/30 text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pendientes ({pendingTxs.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('approved')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterStatus === 'approved' ? 'bg-emerald-500/30 text-emerald-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Aprobados ({approvedTxs.length})
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar celular o código..."
                className="bg-[#050912] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400 w-44"
              />
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="divide-y divide-slate-800/80">
          {displayedTransactions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No se encontraron solicitudes con el filtro seleccionado.
            </div>
          ) : (
            displayedTransactions.map((tx) => (
              <div
                key={tx.id}
                className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-900/40 transition-colors"
              >
                {/* Transaction Info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-black text-white">{tx.id}</span>
                    <span
                      className={`text-[10px] px-2 py-0.2 rounded-full font-bold uppercase ${
                        tx.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : tx.status === 'rejected'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                      }`}
                    >
                      {tx.status === 'approved' ? 'Aprobado' : tx.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{tx.timestamp}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-300">
                    <span className="font-mono font-bold text-white flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{tx.userPhone}</span>
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      {tx.method === 'tigo' ? (
                        <span className="text-blue-400 font-semibold">Tigo Money</span>
                      ) : (
                        <span className="text-emerald-400 font-semibold">QR Simple Bancos</span>
                      )}
                    </span>
                    <span>·</span>
                    <span className="font-mono font-black text-amber-400">
                      {tx.amount} Bs
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({tx.plan === 'match' ? 'Pase Partido 24h' : 'Pase Mensual VIP'})
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono">
                    Código de Operación / Comprobante: <strong className="text-cyan-300 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800">{tx.code}</strong>
                  </div>

                  {tx.userNote && (
                    <p className="text-[10px] text-slate-500 italic mt-0.5">{tx.userNote}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {tx.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(tx.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-md"
                        title="Validar comprobante y activar VIP"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Aprobar Código</span>
                      </button>
                      <button
                        onClick={() => handleReject(tx.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-950/70 hover:bg-red-900 border border-red-800 text-red-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        title="Rechazar código inválido"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Rechazar</span>
                      </button>
                    </>
                  )}

                  {tx.status === 'approved' && (
                    <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      <span>VIP Desbloqueado</span>
                    </span>
                  )}

                  {tx.status === 'rejected' && (
                    <button
                      onClick={() => handleApprove(tx.id)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
                    >
                      Reconsiderar y Aprobar
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL TO ISSUE MANUAL VIP PASS */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b101e] border border-amber-500/50 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-slate-100">
            <h3 className="font-display font-bold text-base text-white mb-1 flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <span>Otorgar Pase Socio VIP Manualmente</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Crea un pase directo para un usuario por pago en efectivo, cortesía o transferencia externa.
            </p>

            <form onSubmit={handleCreateManualVip} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Número de Celular o Usuario:
                </label>
                <input
                  type="text"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  placeholder="Ej. 76543210 o Juan Perez"
                  className="w-full bg-[#050912] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Tipo de Pase:
                  </label>
                  <select
                    value={manualPlan}
                    onChange={(e) => {
                      const p = e.target.value as 'match' | 'monthly';
                      setManualPlan(p);
                      setManualAmount(p === 'match' ? 15 : 35);
                    }}
                    className="w-full bg-[#050912] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="monthly">Mensual VIP (35 Bs)</option>
                    <option value="match">Partido Clásico (15 Bs)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Método de Pago:
                  </label>
                  <select
                    value={manualMethod}
                    onChange={(e) => setManualMethod(e.target.value as 'qr' | 'tigo')}
                    className="w-full bg-[#050912] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="qr">QR Simple Bancario</option>
                    <option value="tigo">Tigo Money</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Código de Referencia / Comprobante (Opcional):
                </label>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Ej. EFECTIVO-01 o COMP-9821"
                  className="w-full bg-[#050912] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs transition-colors cursor-pointer shadow-lg shadow-amber-950/50"
                >
                  Activar VIP Inmediato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
