import { useEffect, useRef, useState, useCallback, RefObject } from 'react';
import Hls from 'hls.js';

interface UseHlsOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
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
      destroyHls();
      return;
    }

    // Clean prior instance
    destroyHls();
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
            // Autoplay policy prevented playback, video might need mute
            video.muted = true;
            video.play().catch(() => {});
          });
        }
        if (onSuccess) onSuccess();
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
                // Failover to backup stream immediately
                setIsUsingBackup(true);
                onFailoverTriggered?.('backup');
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
                onFailoverTriggered?.('backup');
                return;
              }
              destroyHls();
              if (onError) onError('Error de conexión con el flujo HLS en vivo.');
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native iOS Safari support
      video.src = effectiveSrc;
      video.addEventListener('loadedmetadata', () => {
        setIsLoaded(true);
        if (autoplay) {
          video.play().catch(() => {
            video.muted = true;
            video.play().catch(() => {});
          });
        }
        if (onSuccess) onSuccess();
      });
      video.addEventListener('error', () => {
        if (autoFailover && backupSrc && !isUsingBackup) {
          setIsUsingBackup(true);
          onFailoverTriggered?.('backup');
        }
      });
    } else {
      if (onError) onError('Tu navegador no es compatible con transmisiones HLS.');
    }

    return () => {
      destroyHls();
    };
  }, [src, backupSrc, isUsingBackup, autoFailover, autoplay, destroyHls, onError, onSuccess, onFailoverTriggered, videoRef]);

  return {
    isLoaded,
    levels,
    currentLevel,
    changeLevel,
    isUsingBackup,
    switchToPrimary: () => {
      setIsUsingBackup(false);
      onFailoverTriggered?.('primary');
    },
    switchToBackup: () => {
      setIsUsingBackup(true);
      onFailoverTriggered?.('backup');
    },
    hlsInstance: hlsRef.current,
  };
}
