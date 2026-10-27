import type { LiveEvent } from '../types/football';

export function normalizeScheduledAt(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') throw new Error('Fecha y hora de inicio no válidas.');
  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/);
  if (!parts) throw new Error('La fecha de inicio debe incluir su zona horaria.');
  const [, year, month, day, hour, minute, second, zone] = parts;
  const maxDay = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  const stamp = Date.parse(value);
  if (+month < 1 || +month > 12 || +day < 1 || +day > maxDay || +hour > 23 || +minute > 59 || +(second || 0) > 59 || (zone !== 'Z' && (+zone.slice(1, 3) > 23 || +zone.slice(4) > 59)) || !Number.isFinite(stamp)) throw new Error('Fecha y hora de inicio no válidas.');
  return new Date(stamp).toISOString();
}

export function scheduledAtOrNull(value: unknown): string | null {
  try { return normalizeScheduledAt(value); } catch { return null; }
}

export function toBoliviaDateTimeInput(value: unknown): string {
  const date = scheduledAtOrNull(value);
  return date ? new Date(Date.parse(date) - 4 * 3600000).toISOString().slice(0, 16) : '';
}

export function fromBoliviaDateTimeInput(value: string): string | null {
  return value ? normalizeScheduledAt(`${value}-04:00`) : null;
}

export function formatEventStart(value: unknown): string | null {
  const date = scheduledAtOrNull(value);
  return date ? new Intl.DateTimeFormat('es-BO', { timeZone: 'America/La_Paz', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(date)) + ' · hora Bolivia' : null;
}

export function sortEventsByStart(events: LiveEvent[]): LiveEvent[] {
  const stamp = (event: LiveEvent) => {
    const date = scheduledAtOrNull(event.scheduledAt);
    return date ? Date.parse(date) : Infinity;
  };
  return [...events].sort((a, b) => {
    const first = stamp(a); const second = stamp(b);
    return first === second ? 0 : first < second ? -1 : 1;
  });
}
