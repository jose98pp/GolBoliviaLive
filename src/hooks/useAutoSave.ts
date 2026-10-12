import { useEffect, useRef, useState } from 'react';

export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions {
  isDirty: boolean;
  /** Any value that changes on every edit; each change restarts the debounce timer. */
  changeKey: unknown;
  /** Returns `false` (or throws) when the save was rejected, e.g. by validation. */
  save: () => Promise<boolean | void>;
  delayMs?: number;
  enabled?: boolean;
}

export function useAutoSave({ isDirty, changeKey, save, delayMs = 1500, enabled = true }: UseAutoSaveOptions): AutoSaveStatus {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!enabled || !isDirty) return;
    setStatus('pending');
    const timer = setTimeout(async () => {
      setStatus('saving');
      try {
        const ok = await saveRef.current();
        setStatus(ok === false ? 'error' : 'saved');
      } catch {
        setStatus('error');
      }
    }, delayMs);
    return () => clearTimeout(timer);
  }, [isDirty, changeKey, enabled, delayMs]);

  return status;
}
