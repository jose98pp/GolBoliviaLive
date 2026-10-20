import type { IptvChannel } from '../../src/types/iptv';

const channels = new Map<string, IptvChannel>();
export const persistenceCalls = { read: 0, save: 0, delete: 0 };
let rejectSave = false;
export function failNextSaveForTest() { rejectSave = true; }

export async function getCustomIptvChannelsFromFirebase(): Promise<IptvChannel[]> {
  persistenceCalls.read++;
  return [...channels.values()];
}

export async function saveCustomIptvChannelToFirebase(channel: IptvChannel): Promise<void> {
  persistenceCalls.save++;
  if (rejectSave) { rejectSave = false; throw new Error('Fixture: persistencia no disponible'); }
  await Promise.resolve();
  channels.set(channel.id, structuredClone(channel));
}

export async function deleteCustomIptvChannelFromFirebase(id: string): Promise<void> {
  persistenceCalls.delete++;
  await Promise.resolve();
  channels.delete(id);
}
