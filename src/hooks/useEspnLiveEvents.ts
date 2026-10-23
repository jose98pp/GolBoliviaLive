import { useEffect, useState } from 'react';
import type { LiveEvent } from '../types/football';
import { espnFootballApi } from '../services/espnFootballApi';

export function useEspnLiveEvents(events: LiveEvent[]): LiveEvent[] {
  const [updates, setUpdates] = useState<Record<string, { key: string; data: Partial<LiveEvent> }>>({});
  const links = JSON.stringify(events.filter(e => e.espnLink?.enabled).map(e => [e.id, e.espnLink!.league, e.espnLink!.eventId]));
  useEffect(() => {
    let cancelled = false;
    let busy = false;
    const refresh = async () => {
      if (busy || document.visibilityState === 'hidden') return;
      busy = true;
      await Promise.all((JSON.parse(links) as string[][]).map(async ([id, league, eventId]) => {
        const data = await espnFootballApi.getLiveMatch(eventId, league);
        if (!cancelled && data) setUpdates(previous => ({ ...previous, [id]: { key: `${league}:${eventId}`, data } }));
      }));
      busy = false;
    };
    void refresh(); const timer = setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => { cancelled = true; clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [links]);
  return events.map(event => {
    const update = updates[event.id];
    return event.espnLink?.enabled && update?.key === `${event.espnLink.league}:${event.espnLink.eventId}` ? { ...event, ...update.data } : event;
  });
}
