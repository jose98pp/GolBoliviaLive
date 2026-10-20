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

const MAX_NETWORK_RECOVERIES = 2;
const MAX_MEDIA_RECOVERIES = 1;
const STARTUP_TIMEOUT_MS = 30000;

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
  const [hlsInstance, setHlsInstance] = useState<Hls | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [levels, setLevels] = useState<{ id: number; height: number; bitrate: number }[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [selection, setSelection] = useState({ src, backup: false });
  const [attempt, setAttempt] = useState(0);
  const isUsingBackup = selection.src === src && selection.backup;
  const callbacksRef = useRef({ onError, onSuccess, onFailoverTriggered, autoplay });
  useEffect(() => {
    callbacksRef.current = { onError, onSuccess, onFailoverTriggered, autoplay };
  });

  const changeLevel = useCallback((levelIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setCurrentLevel(levelIndex);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const rawTarget = isUsingBackup && backupSrc ? backupSrc : (src || backupSrc);
    setIsLoaded(false);
    setLevels([]);
    setCurrentLevel(-1);
    setHlsInstance(null);
    if (!video || !rawTarget) return;

    const effectiveSrc = getProxiedStreamUrl(rawTarget);
    let hls: Hls | null = null;
    let stopped = false;
    let proxyAttempted = effectiveSrc.includes('/api/proxy');
    let networkRecoveries = 0;
    let mediaRecoveries = 0;
    let startupTimer: ReturnType<typeof setTimeout> | undefined;

    const releaseVideo = () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
    const stop = () => {
      stopped = true;
      clearTimeout(startupTimer);
      startupTimer = undefined;
      hls?.destroy();
      if (hlsRef.current === hls) hlsRef.current = null;
      hls = null;
      releaseVideo();
    };
    const fail = (message: string) => {
      if (stopped) return;
      stop();
      setIsLoaded(false);
      setHlsInstance(null);
      if (autoFailover && backupSrc && !isUsingBackup && rawTarget !== backupSrc) {
        setSelection({ src, backup: true });
        callbacksRef.current.onFailoverTriggered?.('backup');
      } else {
        callbacksRef.current.onError?.(message);
      }
    };
    const armDeadline = () => {
      if (stopped || startupTimer !== undefined || !callbacksRef.current.autoplay) return;
      startupTimer = setTimeout(() => {
        startupTimer = undefined;
        if (callbacksRef.current.autoplay) fail('La señal no respondió a tiempo. Pulsa Reintentar o selecciona otro canal.');
      }, STARTUP_TIMEOUT_MS);
    };
    const play = () => {
      if (!callbacksRef.current.autoplay || stopped) return;
      video.play().catch(() => {
        if (stopped || !callbacksRef.current.autoplay) return;
        video.muted = true;
        video.play().catch(() => {});
      });
    };
    const onPlaying = () => {
      if (stopped) return;
      clearTimeout(startupTimer);
      startupTimer = undefined;
      setIsLoaded(true);
      callbacksRef.current.onSuccess?.();
    };
    const tryProxy = () => {
      if (proxyAttempted || stopped) return false;
      const proxied = getProxiedStreamUrl(rawTarget, true);
      if (proxied === effectiveSrc) return false;
      proxyAttempted = true;
      if (hls) {
        hls.loadSource(proxied);
        hls.startLoad();
      } else {
        video.src = proxied;
        video.load();
      }
      return true;
    };
    const onNativeMetadata = () => {
      if (!stopped) play();
    };
    const onNativeError = () => {
      if (!stopped && !tryProxy()) fail('No se pudo cargar la señal. Pulsa Reintentar para volver a conectarte.');
    };

    releaseVideo();
    video.addEventListener('playing', onPlaying);
    video.addEventListener('waiting', armDeadline);
    video.addEventListener('stalled', armDeadline);
    armDeadline();

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 2,
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 2,
        fragLoadingTimeOut: 12000,
        fragLoadingMaxRetry: 2,
        startLevel: -1,
        progressive: true,
      });
      const instance = hls;
      hlsRef.current = instance;
      setHlsInstance(instance);
      instance.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        if (stopped) return;
        setLevels(data.levels.map((level, id) => ({ id, height: level.height, bitrate: level.bitrate })));
        play();
      });
      instance.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        if (!stopped) setCurrentLevel(data.level);
      });
      instance.on(Hls.Events.ERROR, (_, data) => {
        if (stopped) return;
        const manifestError = [
          Hls.ErrorDetails.MANIFEST_LOAD_ERROR,
          Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT,
          Hls.ErrorDetails.MANIFEST_PARSING_ERROR,
        ].includes(data.details);
        if (manifestError && tryProxy()) return;
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          if (tryProxy()) return;
          if (networkRecoveries++ < MAX_NETWORK_RECOVERIES) {
            instance.startLoad();
            return;
          }
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveries++ < MAX_MEDIA_RECOVERIES) {
          instance.recoverMediaError();
          return;
        }
        fail('No pudimos recuperar la transmisión. Pulsa Reintentar o selecciona otro canal.');
      });
      instance.attachMedia(video);
      instance.loadSource(effectiveSrc);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.addEventListener('loadedmetadata', onNativeMetadata);
      video.addEventListener('error', onNativeError);
      video.src = effectiveSrc;
    } else {
      fail('Tu navegador no es compatible con transmisiones HLS.');
    }

    return () => {
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('waiting', armDeadline);
      video.removeEventListener('stalled', armDeadline);
      video.removeEventListener('loadedmetadata', onNativeMetadata);
      video.removeEventListener('error', onNativeError);
      stop();
    };
  }, [src, backupSrc, isUsingBackup, autoFailover, attempt, videoRef]);

  return {
    isLoaded,
    levels,
    currentLevel,
    changeLevel,
    isUsingBackup,
    switchToPrimary: () => {
      setSelection({ src, backup: false });
      callbacksRef.current.onFailoverTriggered?.('primary');
    },
    switchToBackup: () => {
      if (!backupSrc || backupSrc === src) return;
      setSelection({ src, backup: true });
      callbacksRef.current.onFailoverTriggered?.('backup');
    },
    retry: () => {
      setSelection({ src, backup: false });
      setAttempt((value) => value + 1);
    },
    hlsInstance,
  };
}
