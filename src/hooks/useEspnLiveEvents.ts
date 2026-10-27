import { getSportsLive } from '../services/sportsApi';
import type { SportsEvent } from '../types/sports';
import { useEffect, useState } from 'react';
import type { LiveEvent } from '../types/football';
import { espnFootballApi } from '../services/espnFootballApi';

export function useEspnLiveEvents(events: LiveEvent[]): LiveEvent[] {
  const [updates, setUpdates] = useState<Record<string, { key: string; data: Partial<LiveEvent> }>>({});
  const sportsLinks = JSON.stringify(events.filter(e => e.sports?.source?.enabled).map(e => [e.id, e.sports!.source!]));
  const [sportsUpdates, setSportsUpdates] = useState<Record<string, { key: string; data: SportsEvent }>>({});
  const links = JSON.stringify(events.filter(e => !e.sports && e.espnLink?.enabled).map(e => [e.id, e.espnLink!.league, e.espnLink!.eventId]));
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
      await Promise.all((JSON.parse(sportsLinks) as [string, NonNullable<SportsEvent['source']>][]).map(async ([id, source]) => {
        const data = await getSportsLive(source);
        if (!cancelled && data) setSportsUpdates(previous => ({ ...previous, [id]: { key: JSON.stringify(source), data } }));
      }));
      busy = false;
    };
    void refresh(); const timer = setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => { cancelled = true; clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [links, sportsLinks]);
  return events.map(event => {
    if (event.sports) {
      const update = sportsUpdates[event.id];
      return event.sports.source?.enabled && update?.key === JSON.stringify(event.sports.source) ? { ...event, ...(update.data.scheduledAt ? { scheduledAt: update.data.scheduledAt } : {}), sports: { ...update.data, competition: event.sports.competition, competitionLogo: event.sports.competitionLogo || update.data.competitionLogo, participants: update.data.participants.map((participant, index) => ({ ...participant, imageUrl: event.sports!.participants[index].name === participant.name ? event.sports!.participants[index].imageUrl || participant.imageUrl : participant.imageUrl })) as SportsEvent['participants'], source: event.sports.source }, isLive: update.data.state === 'live' || update.data.state === 'break' } : event;
    }
    const update = updates[event.id];
    return event.espnLink?.enabled && update?.key === `${event.espnLink.league}:${event.espnLink.eventId}` ? { ...event, ...update.data } : event;
  });
}
