import { useState, useEffect, useCallback, RefObject } from 'react';

/**
 * Custom hook to handle full screen mode and auto-rotate (landscape lock)
 * on mobile devices when expanding/fullscreening the video player.
 */
export function useFullscreen(
  containerRef: RefObject<HTMLDivElement | null>,
  videoRef?: RefObject<HTMLVideoElement | null>
) {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Helper to lock screen to landscape when entering fullscreen
  const lockLandscape = useCallback(async () => {
    try {
      const orientation = screen.orientation as any;
      if (orientation && typeof orientation.lock === 'function') {
        try {
          await orientation.lock('landscape');
          return;
        } catch {
          // Fallback to landscape-primary if general landscape rejected
          await orientation.lock('landscape-primary');
          return;
        }
      }

      // Legacy prefixes for Android / older WebKit
      const screenAny = screen as any;
      if (screenAny.lockOrientation) {
        screenAny.lockOrientation('landscape');
      } else if (screenAny.webkitLockOrientation) {
        screenAny.webkitLockOrientation('landscape');
      } else if (screenAny.mozLockOrientation) {
        screenAny.mozLockOrientation('landscape');
      } else if (screenAny.msLockOrientation) {
        screenAny.msLockOrientation('landscape');
      }
    } catch {
      // Gracefully continue if device/browser disallows programmatic orientation lock
    }
  }, []);

  // Helper to unlock screen orientation when exiting fullscreen
  const unlockOrientation = useCallback(() => {
    try {
      const orientation = screen.orientation as any;
      if (orientation && typeof orientation.unlock === 'function') {
        orientation.unlock();
        return;
      }

      const screenAny = screen as any;
      if (screenAny.unlockOrientation) {
        screenAny.unlockOrientation();
      } else if (screenAny.webkitUnlockOrientation) {
        screenAny.webkitUnlockOrientation();
      } else if (screenAny.mozUnlockOrientation) {
        screenAny.mozUnlockOrientation();
      } else if (screenAny.msUnlockOrientation) {
        screenAny.msUnlockOrientation();
      }
    } catch {
      // Safe ignore
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      setIsFullscreen(isFs);

      if (isFs) {
        lockLandscape();
      } else {
        unlockOrientation();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      unlockOrientation();
    };
  }, [lockLandscape, unlockOrientation]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!isFullscreen) {
        const el = containerRef.current as any;
        const vid = videoRef?.current as any;

        // Standard Fullscreen API
        if (el?.requestFullscreen) {
          await el.requestFullscreen();
          await lockLandscape();
        } else if (el?.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
          await lockLandscape();
        } else if (el?.mozRequestFullScreen) {
          await el.mozRequestFullScreen();
          await lockLandscape();
        } else if (el?.msRequestFullscreen) {
          await el.msRequestFullscreen();
          await lockLandscape();
        } else if (vid?.webkitEnterFullscreen) {
          // iOS Safari native video fullscreen (automatically handles landscape orientation on iPhone)
          vid.webkitEnterFullscreen();
        }
      } else {
        unlockOrientation();
        const doc = document as any;
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
      }
    } catch {
      // Browser denied or failed
    }
  }, [isFullscreen, containerRef, videoRef, lockLandscape, unlockOrientation]);

  return { isFullscreen, toggleFullscreen, lockLandscape, unlockOrientation };
}
