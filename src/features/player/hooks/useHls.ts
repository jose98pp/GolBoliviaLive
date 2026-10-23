import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { HLS_PLAYBACK_CONFIG } from '../hlsConfig';
import { getProxiedStreamUrl, normalizeExternalPlayerUrl } from '../../../utils/streamUtils';

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
    if (!video || !rawTarget || normalizeExternalPlayerUrl(rawTarget)) return;

    const effectiveSrc = getProxiedStreamUrl(rawTarget);
    let hls: Hls | null = null;
    let stopped = false;
    let proxyAttempted = effectiveSrc.includes('/api/proxy');
    let networkRecoveries = 0;
    let mediaRecoveries = 0;
    let lastFailure = '';
    let manifestLoaded = false;
    let activeUrl = effectiveSrc;
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
        if (callbacksRef.current.autoplay) {
          const detail = lastFailure || (manifestLoaded
            ? 'El manifiesto cargó, pero no llegaron segmentos reproducibles (posible restricción, codec o DRM).'
            : 'No se recibió un manifiesto HLS reproducible (posible bloqueo de red, CORS, enlace caducado o restricción de acceso).');
          fail(`${detail} Pulsa Reintentar o selecciona otro canal.`);
        }
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
      activeUrl = proxied;
      lastFailure = 'Falló el acceso directo; se intentó una ruta alternativa autorizada.';
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
      hls = new Hls(HLS_PLAYBACK_CONFIG);
      const instance = hls;
      hlsRef.current = instance;
      setHlsInstance(instance);
      instance.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        if (stopped) return;
        manifestLoaded = true;
        lastFailure = '';
        setLevels(data.levels.map((level, id) => ({ id, height: level.height, bitrate: level.bitrate })));
        play();
      });
      instance.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        if (!stopped) setCurrentLevel(data.level);
      });
      instance.on(Hls.Events.ERROR, (_, data) => {
        if (stopped) return;
        const statusCode = data.response?.code;
        const responseUrl = data.response?.url || activeUrl;
        const viaProxy = responseUrl.includes('/api/proxy') || responseUrl.includes('/proxy?url=');
        const requestKind = data.details.includes('frag') ? 'segmento de video' : data.details.includes('level') ? 'lista de calidad' : data.details.includes('key') ? 'clave de cifrado' : 'manifiesto HLS';
        const originLabel = viaProxy ? 'a través del proxy de GolBoliviaLive' : 'en conexión directa con el servidor de la señal';
        if (statusCode === 401 || statusCode === 403) {
          if (!viaProxy && tryProxy()) return;
          // En el proxy, 403 puede venir de su política local o del origen: no atribuirlo sin evidencia.
          fail(`HTTP ${statusCode} al solicitar ${requestKind} ${originLabel}. ${viaProxy ? 'Puede ser un rechazo del proxy o del servidor original; revisa X-GolBolivia-Proxy-Error en Red/Network para distinguirlos.' : 'El servidor rechazó la solicitud; puede requerir autorización.'}`);
          return;
        }
        if (statusCode === 404 || statusCode === 410) {
          fail(`HTTP ${statusCode} al solicitar ${requestKind} ${originLabel}. El enlace puede haber caducado; actualiza la lista M3U.`);
          return;
        }
        lastFailure = data.type === Hls.ErrorTypes.NETWORK_ERROR
          ? `Error de red al cargar ${requestKind} ${originLabel} (${data.details})${statusCode ? ` HTTP ${statusCode}` : ''}.`
          : data.type === Hls.ErrorTypes.MEDIA_ERROR
            ? `Error de decodificación del video (${data.details}).`
            : `Error HLS (${data.details}).`;
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
        const status = data.response?.code;
        const detail = status && status >= 400 && status <= 599 ? ` La solicitud devolvió HTTP ${status}.` : '';
        fail(`No pudimos recuperar la transmisión.${detail} Pulsa Reintentar o selecciona otro canal.`);
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
