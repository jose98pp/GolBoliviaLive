import type { LiveEvent, StreamSettings } from '../types/football';

export function buildMatchStreamPatch(body: Partial<StreamSettings>, event?: LiveEvent): Partial<LiveEvent> {
  const patch: Partial<LiveEvent> = {};
  const names = { title: 'title', homeClubId: 'homeTeam', awayClubId: 'awayTeam', tournamentName: 'tournamentName', stadiumName: 'stadiumName',
    customVideoUrl: 'customVideoUrl', backupVideoUrl: 'backupVideoUrl', backupChannelName: 'backupChannelName' } as const;
  for (const [input, output] of Object.entries(names)) {
    const value = body[input as keyof typeof names];
    if (typeof value === 'string') (patch as Record<string, unknown>)[output] = value.trim();
  }
  for (const key of ['primaryProvider', 'cloudflare', 'youtube', 'kick', 'fallbackOrder', 'activeStreamSource', 'autoFailoverEnabled', 'broadcastMode', 'period', 'isLive'] as const) {
    if (body[key] !== undefined) (patch as Record<string, unknown>)[key] = body[key];
  }
  if (typeof body.customVideoUrl === 'string') {
    patch.cloudflare = { liveInputId: event?.cloudflare?.liveInputId || '', ...patch.cloudflare, playbackUrl: body.customVideoUrl.trim() };
  }
  return patch;
}
