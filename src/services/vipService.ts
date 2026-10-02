import { VipTransaction } from '../types/football';

const STORAGE_KEY = 'golbolivia_vip_requests';
const CHANNEL_NAME = 'golbolivia_vip_channel';

const INITIAL_TRANSACTIONS: VipTransaction[] = [
  {
    id: 'TRX-9481',
    userPhone: '76512349',
    code: 'TIGO-882194',
    method: 'tigo',
    plan: 'monthly',
    amount: 35,
    timestamp: 'Hace 4 min',
    status: 'pending',
    userNote: 'Transferencia por Tigo Money desde El Alto para ver el clásico en 1080p',
  },
  {
    id: 'TRX-9480',
    userPhone: '71984210',
    code: 'BUN-773910',
    method: 'qr',
    plan: 'match',
    amount: 15,
    timestamp: 'Hace 12 min',
    status: 'pending',
    userNote: 'Pago QR Simple Banco Unión - Comprobante de 15 Bs',
  },
  {
    id: 'TRX-9478',
    userPhone: '72045612',
    code: 'BCP-492019',
    method: 'qr',
    plan: 'monthly',
    amount: 35,
    timestamp: 'Hace 28 min',
    status: 'approved',
    userNote: 'Socio VIP Bolívar - Verificado',
  },
  {
    id: 'TRX-9475',
    userPhone: '77891234',
    code: 'TIGO-119283',
    method: 'tigo',
    plan: 'match',
    amount: 15,
    timestamp: 'Hace 45 min',
    status: 'approved',
    userNote: 'Pase Clásico Paceño activado',
  },
  {
    id: 'TRX-9470',
    userPhone: '76112233',
    code: 'INV-000000',
    method: 'qr',
    plan: 'monthly',
    amount: 35,
    timestamp: 'Hace 1 hora',
    status: 'rejected',
    userNote: 'Código inválido o comprobante duplicado',
  }
];

export function getVipTransactions(): VipTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  // Initialize with realistic match transactions
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_TRANSACTIONS));
  } catch {}
  return INITIAL_TRANSACTIONS;
}

export function saveVipTransactions(transactions: VipTransaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel(CHANNEL_NAME);
      bc.postMessage({ type: 'VIP_TRANSACTIONS_UPDATED', transactions });
      bc.close();
    }
  } catch {}
}

export function registerVipTransaction(
  userPhone: string,
  code: string,
  method: 'qr' | 'tigo',
  plan: 'match' | 'monthly',
  amount: number,
  userNote?: string
): VipTransaction {
  const current = getVipTransactions();
  const newTx: VipTransaction = {
    id: `TRX-${Math.floor(1000 + Math.random() * 9000)}`,
    userPhone,
    code: code || `AUTO-${Math.floor(100000 + Math.random() * 900000)}`,
    method,
    plan,
    amount,
    timestamp: 'Justo ahora',
    status: 'pending',
    userNote,
  };
  const updated = [newTx, ...current];
  saveVipTransactions(updated);
  return newTx;
}

export function updateTransactionStatus(
  id: string,
  status: 'approved' | 'rejected',
  notes?: string
): VipTransaction[] {
  const current = getVipTransactions();
  const updated = current.map((tx) => {
    if (tx.id === id) {
      return {
        ...tx,
        status,
        userNote: notes || (status === 'approved' ? 'Validado manualmente por el Administrador' : 'Rechazado por el Administrador'),
      };
    }
    return tx;
  });
  saveVipTransactions(updated);
  return updated;
}
