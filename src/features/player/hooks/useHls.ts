import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { getProxiedStreamUrl } from '../../../utils/streamUtils';

interface UseHlsOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  src?: string;
  backupSrc?: string;
  autoFailover?: boolean;
  autoplay?: boolean;
  onError?: (err: string) => void;
  onSuccess?: () => void;
  onFailoverTriggered?: (source: 'backup' | 'primary') => void;
}

export function useHls({
  videoRef,
  src,
  backupSrc,
  autoFailover = true,
  autoplay = true,
  onError,
  onSuccess,
  onFailoverTriggered,
}: UseHlsOptions) {
  const hlsRef = useRef<Hls | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [levels, setLevels] = useState<{ id: number; height: number; bitrate: number }[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 = auto
  const [isUsingBackup, setIsUsingBackup] = useState<boolean>(false);
  const networkErrorCountRef = useRef<number>(0);
  const proxyAttemptedRef = useRef<boolean>(false);
  const prevSrcRef = useRef<string | undefined>(undefined);

  // Store latest callbacks in ref so changing inline callback instances never trigger useEffect loops
  const callbacksRef = useRef({ onError, onSuccess, onFailoverTriggered });
  useEffect(() => {
    callbacksRef.current = { onError, onSuccess, onFailoverTriggered };
  });

  // Al cambiar de canal o fuente, reiniciar estados de fallo y proxy para que no quede atascado en backup
  if (prevSrcRef.current !== src) {
    prevSrcRef.current = src;
    if (isUsingBackup) {
      setIsUsingBackup(false);
    }
    networkErrorCountRef.current = 0;
    proxyAttemptedRef.current = false;
  }

  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    setIsLoaded(false);
  }, []);

  const changeLevel = useCallback((levelIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setCurrentLevel(levelIndex);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const rawTarget = (isUsingBackup && backupSrc) ? backupSrc : (src || backupSrc);
    if (!video || !rawTarget) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      setIsLoaded(false);
      return;
    }

    // Auto-proxy para fuentes HTTP externas para evitar bloqueos Mixed Content en HTTPS (Vercel)
    const effectiveSrc = getProxiedStreamUrl(rawTarget);

    // Limpiar instancia previa y buffer del video
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    try {
      video.pause();
      video.removeAttribute('src');
      video.load();
    } catch {}

    networkErrorCountRef.current = 0;

    // Check if HLS.js is supported
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
        // Detección veloz de fallos y cambio inmediato de canal (sin esperas de 12s)
        manifestLoadingTimeOut: 4000,
        manifestLoadingMaxRetry: 1,
        levelLoadingTimeOut: 4500,
        levelLoadingMaxRetry: 1,
        fragLoadingTimeOut: 6000,
        fragLoadingMaxRetry: 2,
        startLevel: -1,
        progressive: true,
      });

      hlsRef.current = hls;

      hls.loadSource(effectiveSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsLoaded(true);
        if (data.levels) {
          setLevels(
            data.levels.map((lvl, idx) => ({
              id: idx,
              height: lvl.height,
              bitrate: lvl.bitrate,
            }))
          );
        }
        if (autoplay) {
          video.play().catch(() => {
            video.muted = true;
            video.play().catch(() => {});
          });
        }
        callbacksRef.current.onSuccess?.();
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentLevel(data.level);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        // Rescate veloz e instantáneo: Si el manifiesto falla por CORS, 403 o error de red
        // (incluso antes de que hls.js agote todos sus reintentos y emita fatal),
        // cambiar inmediatamente a /api/proxy para que el canal cargue en milisegundos
        const isManifestError =
          data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
          data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT ||
          data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR;

        if (
          isManifestError &&
          !proxyAttemptedRef.current &&
          rawTarget &&
          !rawTarget.includes('/api/proxy') &&
          !effectiveSrc.includes('/api/proxy')
        ) {
          proxyAttemptedRef.current = true;
          const proxiedUrl = getProxiedStreamUrl(rawTarget, true);
          hls.loadSource(proxiedUrl);
          hls.startLoad();
          return;
        }

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              networkErrorCountRef.current += 1;
              // Si falla por CORS o bloqueo de red en HTTPS directo y aún no se probó el proxy, rescatarlo vía /api/proxy
              if (
                !proxyAttemptedRef.current &&
                rawTarget &&
                !rawTarget.includes('/api/proxy') &&
                !effectiveSrc.includes('/api/proxy')
              ) {
                proxyAttemptedRef.current = true;
                const proxiedUrl = getProxiedStreamUrl(rawTarget, true);
                hls.loadSource(proxiedUrl);
                hls.startLoad();
                return;
              }
              if (networkErrorCountRef.current >= 2 && autoFailover && backupSrc && !isUsingBackup && src !== backupSrc) {
                setIsUsingBackup(true);
                callbacksRef.current.onFailoverTriggered?.('backup');
                return;
              }
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              if (autoFailover && backupSrc && !isUsingBackup && src !== backupSrc) {
                setIsUsingBackup(true);
                callbacksRef.current.onFailoverTriggered?.('backup');
                return;
              }
              if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
              }
              setIsLoaded(false);
              callbacksRef.current.onError?.('Error de conexión con el flujo HLS en vivo.');
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = effectiveSrc;
      const onLoadedMetadata = () => {
        setIsLoaded(true);
        if (autoplay) {
          video.play().catch(() => {
            video.muted = true;
            video.play().catch(() => {});
          });
        }
        callbacksRef.current.onSuccess?.();
      };
      const onVideoError = () => {
        if (!proxyAttemptedRef.current && rawTarget && !rawTarget.includes('/api/proxy') && !effectiveSrc.includes('/api/proxy')) {
          proxyAttemptedRef.current = true;
          video.src = getProxiedStreamUrl(rawTarget, true);
          video.load();
          video.play().catch(() => {});
          return;
        }
        if (autoFailover && backupSrc && !isUsingBackup) {
          setIsUsingBackup(true);
          callbacksRef.current.onFailoverTriggered?.('backup');
        }
      };
      video.addEventListener('loadedmetadata', onLoadedMetadata);
      video.addEventListener('error', onVideoError);
      return () => {
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('error', onVideoError);
      };
    } else {
      callbacksRef.current.onError?.('Tu navegador no es compatible con transmisiones HLS.');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, backupSrc, isUsingBackup, autoFailover, autoplay]);

  return {
    isLoaded,
    levels,
    currentLevel,
    changeLevel,
    isUsingBackup,
    switchToPrimary: () => {
      setIsUsingBackup(false);
      callbacksRef.current.onFailoverTriggered?.('primary');
    },
    switchToBackup: () => {
      setIsUsingBackup(true);
      callbacksRef.current.onFailoverTriggered?.('backup');
    },
    hlsInstance: hlsRef.current,
  };
}
