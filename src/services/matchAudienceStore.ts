import { collection, doc, getDoc, getCountFromServer, query, where, runTransaction } from 'firebase/firestore';
import { db, waitForFirestoreWriter } from './firebase';
import { AUDIENCE_LEASE_MS } from '../types/matchAudience';
import type { MatchAudienceStats } from '../types/matchAudience';

const count = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
export async function getMatchAudienceStats(matchId: string, now = Date.now()): Promise<MatchAudienceStats> {
  await waitForFirestoreWriter();
  const ref = doc(db, 'matchAnalytics', matchId);
  const [snapshot, active] = await Promise.all([getDoc(ref), getCountFromServer(query(collection(db, 'matchAnalytics', matchId, 'visitors'), where('lastSeenAt', '>', now - AUDIENCE_LEASE_MS)))]);
  let data = snapshot.data() || {};
  const activeNow = active.data().count;
  if (activeNow > count(data.peakViewers)) {
    data = await runTransaction(db, async transaction => {
      const current = (await transaction.get(ref)).data() || {};
      const updated = { ...current, peakViewers: Math.max(activeNow, count(current.peakViewers)), updatedAt: now };
      transaction.set(ref, updated, { merge: true });
      return updated;
    });
  }
  return { activeNow, uniqueVisitors: count(data.uniqueVisitors), peakViewers: count(data.peakViewers), hlsPlays: count(data.hlsPlays), updatedAt: now };
}
export async function recordMatchAudience(matchId: string, visitorKey: string, sessionId: string, playbackKey: string | undefined, leave: boolean, now = Date.now()): Promise<MatchAudienceStats> {
  await waitForFirestoreWriter();
  const summaryRef = doc(db, 'matchAnalytics', matchId);
  const visitorRef = doc(db, 'matchAnalytics', matchId, 'visitors', visitorKey);
  const playRef = playbackKey && !leave ? doc(db, 'matchAnalytics', matchId, 'plays', playbackKey) : null;
  await runTransaction(db, async transaction => {
    const visitor = await transaction.get(visitorRef);
    const playback = playRef ? await transaction.get(playRef) : null;
    if (leave && !visitor.exists()) return;
    const newVisitor = !visitor.exists() && !leave;
    const newPlay = Boolean(playRef && playback && !playback.exists());
    const summary = newVisitor || newPlay ? await transaction.get(summaryRef) : null;
    const previous = visitor.data() || {};
    const sessions: Record<string, number> = Object.fromEntries(Object.entries(previous.sessions || {}).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > now - AUDIENCE_LEASE_MS));
    if (leave) delete sessions[sessionId]; else sessions[sessionId] = now;
    const recent = Object.entries(sessions).sort((a, b) => b[1] - a[1]).slice(0, 32);
    transaction.set(visitorRef, { firstSeenAt: previous.firstSeenAt || now, sessions: Object.fromEntries(recent), lastSeenAt: recent.length ? Math.max(...recent.map(([, seen]) => seen)) : 0 });
    if (newVisitor || newPlay) {
      const stats = summary?.data() || {};
      transaction.set(summaryRef, { uniqueVisitors: count(stats.uniqueVisitors) + Number(newVisitor), hlsPlays: count(stats.hlsPlays) + Number(newPlay), updatedAt: now }, { merge: true });
    }
    if (newPlay && playRef) transaction.set(playRef, { startedAt: now });
  });
  return getMatchAudienceStats(matchId, now);
}
