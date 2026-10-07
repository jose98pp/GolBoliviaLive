/**
 * Utilities for match slug URLs (/live/bolivar-the-strongest, /live/blooming-oriente)
 */
import { LiveEvent } from '../types/football';

export function getMatchSlug(event: LiveEvent): string {
  if (event.id === 'partido-001') return 'bolivar-the-strongest';
  if (event.id === 'partido-002') return 'blooming-oriente';

  // Slugify title
  return event.title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumeric to hyphens
    .replace(/^-+|-+$/g, '') || event.id;
}

export function findEventBySlug(events: LiveEvent[], slug: string): LiveEvent | undefined {
  const clean = slug.toLowerCase().trim().replace(/^\/live\//, '').replace(/^\//, '');
  if (!clean) return undefined;

  return events.find((e) => {
    const eventSlug = getMatchSlug(e);
    return (
      e.id === clean ||
      eventSlug === clean ||
      clean.includes(eventSlug) ||
      eventSlug.includes(clean)
    );
  });
}
