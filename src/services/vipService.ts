import { VipTransaction } from '../types/football';

const STORAGE_KEY = 'golbolivia_vip_requests';
const CHANNEL_NAME = 'golbolivia_vip_channel';

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
  // Sin transacciones de ejemplo: solo existen las que se registran de verdad.
  return [];
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
