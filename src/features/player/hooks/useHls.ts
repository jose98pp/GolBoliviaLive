import { useEffect, useRef, useState, useCallback, RefObject } from 'react';
import Hls from 'hls.js';

interface UseHlsOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  src?: string;
  autoplay?: boolean;
  onError?: (err: string) => void;
  onSuccess?: () => void;
}

export function useHls({
  videoRef,
  src,
  autoplay = true,
  onError,
  onSuccess,
}: UseHlsOptions) {
  const hlsRef = useRef<Hls | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [levels, setLevels] = useState<{ id: number; height: number; bitrate: number }[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 = auto

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
    if (!video || !src) {
      destroyHls();
      return;
    }

    // Clean prior instance
    destroyHls();

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

      hls.loadSource(src);
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
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              destroyHls();
              if (onError) onError('Error de conexión con el flujo HLS en vivo.');
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native iOS Safari support
      video.src = src;
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
    } else {
      if (onError) onError('Tu navegador no es compatible con transmisiones HLS.');
    }

    return () => {
      destroyHls();
    };
  }, [src, autoplay, destroyHls, onError, onSuccess, videoRef]);

  return {
    isLoaded,
    levels,
    currentLevel,
    changeLevel,
    hlsInstance: hlsRef.current,
  };
}
