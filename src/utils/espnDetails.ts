import type { MatchEvent } from '../types/football';

export interface EspnStandingRow {
  id: string; name: string; logo: string;
  position: number | null; played: number | null; won: number | null; drawn: number | null;
  lost: number | null; goalDiff: number | null; points: number | null;
}
export interface EspnStandingGroup { name: string; rows: EspnStandingRow[] }

export function parseEspnStandings(raw: any): EspnStandingGroup[] {
  const groups: EspnStandingGroup[] = [];
  const visit = (node: any, inherited = '') => {
    if (!node || typeof node !== 'object') return;
    const name = String(node.name || node.displayName || inherited || 'Clasificación');
    const tables = Array.isArray(node.standings) ? node.standings : node.standings ? [node.standings] : node.entries ? [node] : [];
    for (const table of tables) {
      if (!Array.isArray(table.entries) || !table.entries.length) continue;
      const rows = table.entries.filter((entry: any) => entry.team?.id && entry.team?.displayName).map((entry: any) => {
        const stat = (...names: string[]): number | null => {
          const item = entry.stats?.find((s: any) => names.includes(s.name));
          if (!item) return null;
          const value = Number(item.value ?? item.displayValue);
          return Number.isFinite(value) ? value : null;
        };
        return { id: String(entry.team.id), name: String(entry.team.displayName), logo: String(entry.team.logos?.[0]?.href || entry.team.logo || ''), position: stat('rank', 'position'), played: stat('gamesPlayed', 'played'), won: stat('wins'), drawn: stat('ties', 'draws'), lost: stat('losses'), goalDiff: stat('pointDifferential', 'goalDifference', 'goalDifferential'), points: stat('points') };
      });
      if (rows.length) groups.push({ name: tables.length > 1 ? `${name} · ${table.name || table.type || ''}` : name, rows });
    }
    if (Array.isArray(node.children)) node.children.forEach((child: any) => visit(child, name));
  };
  visit(raw);
  return groups;
}

export function parseEspnHighlights(eventId: string, raw: any): MatchEvent[] {
  const teams = raw.header?.competitions?.[0]?.competitors || [];
  const highlights = Array.isArray(raw.keyEvents) && raw.keyEvents.length ? raw.keyEvents : Array.isArray(raw.commentary) ? raw.commentary : [];
  const events = new Map<string, MatchEvent>();
  for (const entry of highlights.slice(-200)) {
    const play = entry.play || entry;
    const clock = play.clock || entry.time || {};
    const display = String(clock.displayValue || clock.displayClock || '');
    const parts = display.match(/(\d+)(?:['’′])?(?:\s*\+\s*(\d+))?/);
    const minute = parts ? Number(parts[1]) + Number(parts[2] || 0) : Math.floor(Math.max(0, Number(clock.value) || 0) / 60);
    const description = String(entry.text || play.text || play.shortText || '').trim();
    if (!description) continue;
    const kind = String(play.type?.text || play.type?.name || '').toLowerCase();
    const type: MatchEvent['type'] = play.scoringPlay || /^(?:goal|gol|own goal|autogol|penalty.*scored)$/.test(kind.trim()) ? 'goal' : play.redCard || /red card|tarjeta roja/.test(kind) ? 'red_card' : play.yellowCard || /yellow card|tarjeta amarilla/.test(kind) ? 'yellow_card' : play.substitution || /substitution|sustituci/.test(kind) ? 'substitution' : 'commentary';
    const team = teams.find((c: any) => String(c.team?.id) === String(play.team?.id))?.team;
    const seed = `${minute}:${type}:${play.team?.id || ''}:${description}`;
    let hash = 0; for (let i = 0; i < seed.length; i++) hash = (Math.imul(hash, 31) + seed.charCodeAt(i)) | 0;
    const id = `espn-${eventId}-${play.id || entry.id || (hash >>> 0).toString(36)}`;
    events.set(id, { id, minute, displayClock: display || (clock.value != null ? `${minute}'` : '—'), source: 'espn', teamName: team?.displayName || play.team?.displayName, type, player: play.participants?.[0]?.athlete?.displayName, description });
  }
  return [...events.values()].sort((a, b) => a.minute - b.minute);
}
