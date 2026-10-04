import { useState, useEffect, useCallback, RefObject } from 'react';

export type CastConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface CastDevice {
  friendlyName: string;
  modelName?: string;
  protocol?: 'google_cast' | 'airplay' | 'remote_playback' | 'manual';
}

export function useCast(
  streamTitle: string,
  streamUrl?: string,
  videoRef?: RefObject<HTMLVideoElement | null>
) {
  const [castStatus, setCastStatus] = useState<CastConnectionStatus>('idle');
  const [castError, setCastError] = useState<string | null>(null);
  const [castDevice, setCastDevice] = useState<CastDevice | null>(null);
  const [isCastAvailable, setIsCastAvailable] = useState<boolean>(false);
  const [isAirPlayAvailable, setIsAirPlayAvailable] = useState<boolean>(false);
  const [isRemotePlaybackAvailable, setIsRemotePlaybackAvailable] = useState<boolean>(false);
  const [showCastModal, setShowCastModal] = useState<boolean>(false);

  // Initialize Google Cast SDK Context
  const initCastContext = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      (window as any).cast?.framework &&
      (window as any).chrome?.cast
    ) {
      try {
        const castFramework = (window as any).cast.framework;
        const chromeCast = (window as any).chrome.cast;
        const context = castFramework.CastContext.getInstance();

        context.setOptions({
          receiverApplicationId: chromeCast.media.DEFAULT_MEDIA_RECEIVER_APP_ID || 'CC1AD845',
          autoJoinPolicy: chromeCast.AutoJoinPolicy.ORIGIN_SCOPED,
        });

        setIsCastAvailable(true);
        return context;
      } catch (err) {
        console.warn('Cast context init warning:', err);
      }
    }
    return null;
  }, []);

  // Listen for Google Cast API load and Remote Playback capabilities
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkAvailability = () => {
      if ((window as any).cast?.framework) {
        initCastContext();
      }
    };

    checkAvailability();

    const handleCastApiAvailable = (e: any) => {
      if (e?.detail?.isAvailable || (window as any).__isGCastApiAvailable) {
        initCastContext();
      }
    };

    window.addEventListener('google-cast-api-available', handleCastApiAvailable);

    // Check Apple AirPlay availability
    const video = videoRef?.current as any;
    if (video) {
      if (window.WebKitPlaybackTargetAvailabilityEvent) {
        const handleAirPlayAvailability = (event: any) => {
          if (event.availability === 'available') {
            setIsAirPlayAvailable(true);
          }
        };
        video.addEventListener(
          'webkitplaybacktargetavailabilitychanged',
          handleAirPlayAvailability
        );
        return () => {
          window.removeEventListener('google-cast-api-available', handleCastApiAvailable);
          video.removeEventListener(
            'webkitplaybacktargetavailabilitychanged',
            handleAirPlayAvailability
          );
        };
      } else if (typeof video.webkitShowPlaybackTargetPicker === 'function') {
        setIsAirPlayAvailable(true);
      }

      // Check W3C Remote Playback API availability (Android Chrome & Smart TV)
      if (video.remote && typeof video.remote.prompt === 'function') {
        setIsRemotePlaybackAvailable(true);
        if (typeof video.remote.watchAvailability === 'function') {
          video.remote
            .watchAvailability((available: boolean) => {
              setIsRemotePlaybackAvailable(available);
            })
            .catch(() => {});
        }
      }
    }

    return () => {
      window.removeEventListener('google-cast-api-available', handleCastApiAvailable);
    };
  }, [initCastContext, videoRef]);

  // Load media into active Cast session
  const loadMediaToCastSession = useCallback(
    async (session: any, url: string, title: string) => {
      if (!session || !url || typeof window === 'undefined') return;
      const chromeCast = (window as any).chrome?.cast;
      if (!chromeCast) return;

      try {
        const isHls = url.includes('.m3u8') || url.includes('/live/');
        const contentType = isHls ? 'application/x-mpegURL' : 'video/mp4';

        const mediaInfo = new chromeCast.media.MediaInfo(url, contentType);
        mediaInfo.streamType = chromeCast.media.StreamType.LIVE;
        mediaInfo.metadata = new chromeCast.media.GenericMediaMetadata();
        mediaInfo.metadata.title = title || 'GolBolivia Live HD';
        mediaInfo.metadata.subtitle = 'División Profesional de Bolivia — Señal Oficial';

        const request = new chromeCast.media.LoadRequest(mediaInfo);
        request.autoplay = true;

        await session.loadMedia(request);
      } catch (err) {
        console.warn('Error loading media to Cast session:', err);
      }
    },
    []
  );

  // Trigger Apple AirPlay picker directly
  const triggerAirPlay = useCallback(() => {
    const video = videoRef?.current as any;
    if (video && typeof video.webkitShowPlaybackTargetPicker === 'function') {
      try {
        video.webkitShowPlaybackTargetPicker();
        setCastStatus('connected');
        setCastDevice({
          friendlyName: 'Apple TV / AirPlay Smart TV',
          protocol: 'airplay',
        });
        return true;
      } catch (err) {
        console.warn('AirPlay picker failed:', err);
      }
    }
    return false;
  }, [videoRef]);

  // Trigger HTML5 Remote Playback (Android / Smart TV)
  const triggerRemotePlayback = useCallback(async () => {
    const video = videoRef?.current as any;
    if (video?.remote && typeof video.remote.prompt === 'function') {
      try {
        setCastStatus('connecting');
        await video.remote.prompt();
        setCastStatus('connected');
        setCastDevice({
          friendlyName: 'Smart TV (Remote Playback)',
          protocol: 'remote_playback',
        });
        return true;
      } catch (err: any) {
        if (err?.name === 'NotAllowedError') {
          // User cancelled dialog
          setCastStatus('idle');
          return true;
        }
      }
    }
    return false;
  }, [videoRef]);

  // Main Cast trigger (auto detects best mechanism or opens modal)
  const startCast = useCallback(async () => {
    setCastError(null);

    // 1. If AirPlay is available (iOS / Safari), try AirPlay first
    const isAppleDevice = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
    if (isAppleDevice && isAirPlayAvailable) {
      const ok = triggerAirPlay();
      if (ok) return;
    }

    // 2. If Remote Playback API is available on mobile/Chrome, try native prompt
    if (isRemotePlaybackAvailable) {
      const handled = await triggerRemotePlayback();
      if (handled && castStatus === 'connected') return;
    }

    // 3. If Google Cast SDK framework is available
    if (typeof window !== 'undefined' && (window as any).cast?.framework) {
      try {
        setCastStatus('connecting');
        const context = initCastContext() || (window as any).cast.framework.CastContext.getInstance();
        await context.requestSession();
        const session = context.getCurrentSession();

        if (session) {
          const device = session.getCastDevice();
          setCastDevice({
            friendlyName: device ? device.friendlyName : 'Smart TV / Chromecast',
            modelName: device ? device.modelName : undefined,
            protocol: 'google_cast',
          });
          setCastStatus('connected');

          if (streamUrl) {
            await loadMediaToCastSession(session, streamUrl, streamTitle);
          }
          return;
        }
      } catch (err: any) {
        if (err && typeof err === 'string' && err.includes('cancel')) {
          setCastStatus('idle');
          return;
        }
        if (err?.message && err.message.includes('cancel')) {
          setCastStatus('idle');
          return;
        }
      }
    }

    // 4. Default: Open intuitive Cast modal with guides & options
    setCastStatus('idle');
    setShowCastModal(true);
  }, [
    isAirPlayAvailable,
    isRemotePlaybackAvailable,
    triggerAirPlay,
    triggerRemotePlayback,
    initCastContext,
    streamUrl,
    streamTitle,
    loadMediaToCastSession,
    castStatus,
  ]);

  const disconnectCast = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && (window as any).cast?.framework) {
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
    isAirPlayAvailable,
    isRemotePlaybackAvailable,
    showCastModal,
    setShowCastModal,
    startCast,
    triggerAirPlay,
    triggerRemotePlayback,
    disconnectCast,
  };
}
