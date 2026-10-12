/**
 * Utilities for match slug URLs (/live/bolivar-the-strongest, /live/blooming-oriente)
 */
import { LiveEvent } from '../types/football';

export function getMatchSlug(event: LiveEvent): string {
  if (!event) return 'partido';

  // Slugify title safely
  const rawTitle = typeof event.title === 'string' ? event.title.trim() : '';
  if (!rawTitle) {
    const home = typeof event.homeTeam === 'string' ? event.homeTeam.trim() : '';
    const away = typeof event.awayTeam === 'string' ? event.awayTeam.trim() : '';
    if (home && away) return `${home}-${away}`;
    return event.id || 'partido';
  }

  return (
    rawTitle
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^a-z0-9]+/g, '-') // non-alphanumeric to hyphens
      .replace(/^-+|-+$/g, '') ||
    event.id ||
    'partido'
  );
}

export function findEventBySlug(events: LiveEvent[], slug: string): LiveEvent | undefined {
  if (!Array.isArray(events) || typeof slug !== 'string') return undefined;
  const clean = slug.toLowerCase().trim().replace(/^\/live\//, '').replace(/^\//, '');
  if (!clean) return undefined;

  return events.find((e) => {
    if (!e) return false;
    const eventSlug = getMatchSlug(e);
    return (
      e.id === clean ||
      eventSlug === clean ||
      (eventSlug && clean.includes(eventSlug)) ||
      (clean && eventSlug.includes(clean))
    );
  });
}
