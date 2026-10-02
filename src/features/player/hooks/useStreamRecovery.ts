import { useState, useCallback, useRef } from 'react';

export function useStreamRecovery(onTriggerReload?: () => void) {
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetRecovery = useCallback(() => {
    setIsReconnecting(false);
    setStreamError(null);
    setRetryCount(0);
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const triggerRecovery = useCallback((errorMessage?: string) => {
    setStreamError(errorMessage || 'Problema de conexión con el servidor de transmisión.');
    setIsReconnecting(true);
    setRetryCount((prev) => prev + 1);

    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
    }

    // Auto-retry with backoff
    retryTimerRef.current = setTimeout(() => {
      setIsReconnecting(false);
      if (onTriggerReload) {
        onTriggerReload();
      }
    }, 3500);
  }, [onTriggerReload]);

  return {
    isReconnecting,
    streamError,
    retryCount,
    setStreamError,
    triggerRecovery,
    resetRecovery,
  };
}
