import { useCallback, useEffect, useRef, useState } from 'react';
import type { MatchAudienceStats } from '../types/matchAudience';

export function useMatchAudience(matchId?: string, enabled = true) {
  const [measurement, setMeasurement] = useState<{ matchId: string; stats: MatchAudienceStats } | null>(null);
  const playbackRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!enabled || !matchId) { playbackRef.current = null; return; }
    let visitorId: string;
    try {
      visitorId = localStorage.getItem('golbolivia_audience_browser') || crypto.randomUUID();
      localStorage.setItem('golbolivia_audience_browser', visitorId);
    } catch { visitorId = crypto.randomUUID(); }
    const sessionId = crypto.randomUUID();
    const playbackId = crypto.randomUUID();
    let playing = false;
    let playRecorded = false;
    let disposed = false;
    let chain = Promise.resolve();
    const url = `/api/match-audience/${encodeURIComponent(matchId)}/heartbeat`;
    const send = (leave = false) => {
      const payload = { visitorId, sessionId, action: leave ? 'leave' : 'heartbeat', ...(!leave && playing && !playRecorded ? { playbackId } : {}) };
      chain = chain.catch(() => {}).then(async () => {
        if (disposed && !leave) return;
        try {
          const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: leave, signal: AbortSignal.timeout(12000) });
          if (!response.ok) return;
          const data = await response.json();
          if (payload.playbackId) playRecorded = true;
          if (!disposed && data.stats) setMeasurement({ matchId, stats: data.stats });
        } catch { /* El vencimiento de presencia cubre desconexiones y cierres inesperados. */ }
      });
    };
    playbackRef.current = () => { if (!playing) { playing = true; if (document.visibilityState === 'visible') send(); } };
    const visibility = () => send(document.visibilityState !== 'visible');
    const leavePage = () => {
      if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([JSON.stringify({ visitorId, sessionId, action: 'leave' })], { type: 'application/json' }));
      else send(true);
    };
    if (document.visibilityState === 'visible') send();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') send(); }, 25000);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', leavePage);
    return () => {
      disposed = true; playbackRef.current = null; clearInterval(timer);
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', leavePage);
      send(true);
    };
  }, [matchId, enabled]);
  useEffect(() => {
    if (!measurement) return;
    const timer = setTimeout(() => setMeasurement(current => current === measurement ? null : current), 70000);
    return () => clearTimeout(timer);
  }, [measurement]);
  const onHlsPlaying = useCallback(() => playbackRef.current?.(), []);
  return { stats: enabled && measurement && measurement.matchId === matchId ? measurement.stats : null, onHlsPlaying };
}
