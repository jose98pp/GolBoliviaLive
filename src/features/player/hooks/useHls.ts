import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';

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

  // Store latest callbacks in ref so changing inline callback instances never trigger useEffect loops
  const callbacksRef = useRef({ onError, onSuccess, onFailoverTriggered });
  useEffect(() => {
    callbacksRef.current = { onError, onSuccess, onFailoverTriggered };
  });

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
    const effectiveSrc = (isUsingBackup && backupSrc) ? backupSrc : (src || backupSrc);
    if (!video || !effectiveSrc) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      setIsLoaded(false);
      return;
    }

    // Clean prior instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    networkErrorCountRef.current = 0;

    // Check if HLS.js is supported
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
        maxBufferLength: 30,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
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
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              networkErrorCountRef.current += 1;
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
