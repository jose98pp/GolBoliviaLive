import { useState, useEffect, useCallback, useRef } from 'react';

export type CastConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface CastDevice {
  friendlyName: string;
  modelName?: string;
}

export function useCast(streamTitle: string, streamUrl?: string) {
  const [castStatus, setCastStatus] = useState<CastConnectionStatus>('idle');
  const [castError, setCastError] = useState<string | null>(null);
  const [castDevice, setCastDevice] = useState<CastDevice | null>(null);
  const [isCastAvailable, setIsCastAvailable] = useState<boolean>(false);
  const [showCastModal, setShowCastModal] = useState<boolean>(false);

  useEffect(() => {
    // Check Google Cast framework availability
    const checkAvailability = () => {
      if (typeof window !== 'undefined' && (window as any).cast && (window as any).cast.framework) {
        setIsCastAvailable(true);
      }
    };

    checkAvailability();
    if (typeof window !== 'undefined') {
      (window as any).__onGCastApiAvailable = (isAvailable: boolean) => {
        setIsCastAvailable(isAvailable);
      };
    }
  }, []);

  const startCast = useCallback(async () => {
    setCastError(null);
    setCastStatus('connecting');

    try {
      if (typeof window !== 'undefined' && (window as any).cast && (window as any).cast.framework) {
        const context = (window as any).cast.framework.CastContext.getInstance();
        await context.requestSession();
        const session = context.getCurrentSession();
        if (session) {
          const device = session.getCastDevice();
          setCastDevice({
            friendlyName: device ? device.friendlyName : 'Smart TV / Chromecast',
            modelName: device ? device.modelName : undefined,
          });
          setCastStatus('connected');
          return;
        }
      }

      // If no Cast extension or on mobile without direct API, open guided Cast modal
      setShowCastModal(true);
      setCastStatus('idle');
    } catch (err: any) {
      if (err && err.message && err.message.includes('cancel')) {
        setCastStatus('idle');
      } else {
        setCastError('No se pudo establecer la conexión directa. Utiliza la opción de Transmitir Pantalla en tu navegador.');
        setCastStatus('error');
        setShowCastModal(true);
      }
    }
  }, []);

  const disconnectCast = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && (window as any).cast && (window as any).cast.framework) {
        const context = (window as any).cast.framework.CastContext.getInstance();
        context.endCurrentSession(true);
      }
    } catch {}
    setCastStatus('idle');
    setCastDevice(null);
  }, []);

  return {
    castStatus,
    castError,
    castDevice,
    isCastAvailable,
    showCastModal,
    setShowCastModal,
    startCast,
    disconnectCast,
  };
}
