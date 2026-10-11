import React from 'react';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import type { AutoSaveStatus } from '../hooks/useAutoSave';

const STATUS_STYLES: Record<Exclude<AutoSaveStatus, 'idle'>, { label: string; className: string }> = {
  pending: { label: 'Cambios sin guardar…', className: 'text-amber-300 border-amber-500/40 bg-amber-950/40' },
  saving: { label: 'Guardando…', className: 'text-sky-300 border-sky-500/40 bg-sky-950/40' },
  saved: { label: 'Guardado automáticamente', className: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/40' },
  error: { label: 'No se pudo guardar', className: 'text-red-300 border-red-500/40 bg-red-950/40' },
};

export const AutoSaveIndicator: React.FC<{ status: AutoSaveStatus }> = ({ status }) => {
  if (status === 'idle') return null;
  const { label, className } = STATUS_STYLES[status];
  const Icon = status === 'error' ? AlertCircle : status === 'saved' ? CheckCircle2 : RefreshCw;
  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${className}`}
    >
      <Icon className={`w-3.5 h-3.5 ${status === 'saving' ? 'animate-spin' : ''}`} />
      <span>{label}</span>
    </span>
  );
};
