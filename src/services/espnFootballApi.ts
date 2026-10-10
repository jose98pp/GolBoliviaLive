import { MatchStats, MatchEvent } from '../types/football';

export interface ApiMatchSummary {
  id: string;
  name: string;
  shortName?: string;
  date: string;
  statusText: string;
  isLive: boolean;
  isFinished: boolean;
  minute?: number;
  homeTeam: {
    id?: string;
    name: string;
    displayName: string;
    score: number;
    logo?: string;
  };
  awayTeam: {
    id?: string;
    name: string;
    displayName: string;
    score: number;
    logo?: string;
  };
  venue?: string;
}

export interface ApiPlayer {
  number: number;
  name: string;
  position: string; // POR, DEF, MED, DEL
  starter: boolean;
}

export interface ApiLineup {
  teamName: string;
  formation: string;
  coach: string;
  starting: ApiPlayer[];
  substitutes: ApiPlayer[];
}

export interface ApiMatchDetails {
  id: string;
  title: string;
  venue?: string;
  homeLineup?: ApiLineup;
  awayLineup?: ApiLineup;
  stats?: MatchStats;
  events?: MatchEvent[];
}

function normalizePosition(posName?: string, abbreviation?: string): string {
  const p = (posName || abbreviation || '').toUpperCase();
  if (p.includes('GOAL') || p === 'G' || p === 'GK' || p === 'POR') return 'POR';
  if (p.includes('DEF') || p === 'D' || p === 'CB' || p === 'LB' || p === 'RB') return 'DEF';
  if (p.includes('MID') || p === 'M' || p === 'MF' || p === 'MED') return 'MED';
  if (p.includes('FOR') || p.includes('ATT') || p === 'F' || p === 'FW' || p === 'DEL') return 'DEL';
  return 'MED';
}

class EspnFootballApiService {
  /**
   * Obtiene la lista de partidos programados y en vivo para la liga boliviana o torneo internacional
   * desde la API gratuita y abierta de ESPN.
   */
  async getMatches(league = 'bol.1'): Promise<ApiMatchSummary[]> {
    try {
      const res = await fetch(`/api/football-api/matches?league=${encodeURIComponent(league)}`);
      if (!res.ok) {
        // Fallback directo a endpoint público de ESPN si el proxy no responde
        const fallbackRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${encodeURIComponent(league)}/scoreboard`);
        if (!fallbackRes.ok) return [];
        const raw = await fallbackRes.json();
        return this.parseScoreboard(raw);
      }
      const data = await res.json();
      return this.parseScoreboard(data);
    } catch (err) {
      console.warn('[EspnFootballApi] Error al obtener partidos:', err);
      return [];
    }
  }

  /**
   * Obtiene estadísticas oficiales y alineaciones detalladas para un partido específico
   */
  async getMatchDetails(eventId: string, league = 'bol.1'): Promise<ApiMatchDetails | null> {
    try {
      let data: any = null;
      const res = await fetch(`/api/football-api/match/${encodeURIComponent(eventId)}?league=${encodeURIComponent(league)}`);
      if (res.ok) {
        data = await res.json();
      } else {
        const fallbackRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${encodeURIComponent(league)}/summary?event=${encodeURIComponent(eventId)}`);
        if (fallbackRes.ok) {
          data = await fallbackRes.json();
        }
      }

      if (!data) return null;
      return this.parseMatchSummary(eventId, data);
    } catch (err) {
      console.warn(`[EspnFootballApi] Error al obtener detalles del evento ${eventId}:`, err);
      return null;
    }
  }

  /**
   * Intenta buscar un partido coincidente a partir de nombres o IDs de clubes locales y visitantes
   */
  async findMatchByTeams(homeName: string, awayName: string, league = 'bol.1'): Promise<ApiMatchSummary | null> {
    const matches = await this.getMatches(league);
    if (!matches || matches.length === 0) return null;

    const cleanH = homeName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanA = awayName.toLowerCase().replace(/[^a-z0-9]/g, '');

    return (
      matches.find((m) => {
        const mH = m.homeTeam.displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const mA = m.awayTeam.displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
        return (mH.includes(cleanH) || cleanH.includes(mH)) && (mA.includes(cleanA) || cleanA.includes(mA));
      }) ||
      matches[0] ||
      null
    );
  }

  private parseScoreboard(raw: any): ApiMatchSummary[] {
    if (!raw || !Array.isArray(raw.events)) return [];

    return raw.events.map((evt: any) => {
      const comp = evt.competitions?.[0];
      const competitors = comp?.competitors || [];
      const homeComp = competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
      const awayComp = competitors.find((c: any) => c.homeAway === 'away') || competitors[1];

      const statusType = evt.status?.type || {};
      const isLive = Boolean(statusType.state === 'in');
      const isFinished = Boolean(statusType.completed || statusType.state === 'post');

      return {
        id: evt.id,
        name: evt.name || `${homeComp?.team?.displayName || 'Local'} vs ${awayComp?.team?.displayName || 'Visitante'}`,
        shortName: evt.shortName,
        date: evt.date,
        statusText: statusType.shortDetail || statusType.description || 'Programado',
        isLive,
        isFinished,
        minute: evt.status?.clock,
        homeTeam: {
          id: homeComp?.team?.id,
          name: homeComp?.team?.name || 'Local',
          displayName: homeComp?.team?.displayName || 'Local',
          score: parseInt(homeComp?.score, 10) || 0,
          logo: homeComp?.team?.logo,
        },
        awayTeam: {
          id: awayComp?.team?.id,
          name: awayComp?.team?.name || 'Visitante',
          displayName: awayComp?.team?.displayName || 'Visitante',
          score: parseInt(awayComp?.score, 10) || 0,
          logo: awayComp?.team?.logo,
        },
        venue: comp?.venue?.fullName || comp?.venue?.address?.city,
      };
    });
  }

  private parseMatchSummary(eventId: string, raw: any): ApiMatchDetails {
    const comp = raw.header?.competitions?.[0];
    const homeComp = comp?.competitors?.find((c: any) => c.homeAway === 'home') || comp?.competitors?.[0];
    const awayComp = comp?.competitors?.find((c: any) => c.homeAway === 'away') || comp?.competitors?.[1];

    const title = `${homeComp?.team?.displayName || 'Local'} vs ${awayComp?.team?.displayName || 'Visitante'}`;
    const venue = raw.gameInfo?.venue?.fullName || 'Estadio Departamental';

    // Parse Rosters / Lineups
    let homeLineup: ApiLineup | undefined;
    let awayLineup: ApiLineup | undefined;

    if (Array.isArray(raw.rosters)) {
      raw.rosters.forEach((r: any) => {
        const isHome = r.homeAway === 'home' || r.team?.id === homeComp?.team?.id;
        const starting: ApiPlayer[] = [];
        const substitutes: ApiPlayer[] = [];

        if (Array.isArray(r.roster)) {
          r.roster.forEach((p: any) => {
            const player: ApiPlayer = {
              number: parseInt(p.jersey, 10) || 0,
              name: p.athlete?.displayName || p.athlete?.fullName || 'Jugador',
              position: normalizePosition(p.position?.displayName, p.position?.abbreviation),
              starter: Boolean(p.starter),
            };
            if (p.starter) starting.push(player);
            else substitutes.push(player);
          });
        }

        const lineupObj: ApiLineup = {
          teamName: r.team?.displayName || (isHome ? 'Local' : 'Visitante'),
          formation: r.formation || '4-3-3',
          coach: r.coach?.[0]?.displayName || 'Director Técnico',
          starting,
          substitutes,
        };

        if (isHome) homeLineup = lineupObj;
        else awayLineup = lineupObj;
      });
    }

    // Parse Statistics from boxscore
    let stats: MatchStats | undefined;
    if (raw.boxscore?.teams && Array.isArray(raw.boxscore.teams)) {
      const tHome = raw.boxscore.teams.find((t: any) => t.team?.id === homeComp?.team?.id) || raw.boxscore.teams[0];
      const tAway = raw.boxscore.teams.find((t: any) => t.team?.id === awayComp?.team?.id) || raw.boxscore.teams[1];

      const getStatVal = (t: any, key: string): number => {
        const item = t?.statistics?.find((s: any) => s.name?.toLowerCase() === key.toLowerCase());
        if (!item) return 0;
        return parseFloat(String(item.displayValue).replace('%', '')) || 0;
      };

      const hPoss = getStatVal(tHome, 'possessionPct') || 50;
      const aPoss = getStatVal(tAway, 'possessionPct') || 50;

      stats = {
        possession: [Math.round(hPoss), Math.round(aPoss)],
        shots: [getStatVal(tHome, 'totalShots') || 0, getStatVal(tAway, 'totalShots') || 0],
        shotsOnTarget: [getStatVal(tHome, 'shotsOnTarget') || 0, getStatVal(tAway, 'shotsOnTarget') || 0],
        corners: [getStatVal(tHome, 'wonCorners') || 0, getStatVal(tAway, 'wonCorners') || 0],
        fouls: [getStatVal(tHome, 'foulsCommitted') || 0, getStatVal(tAway, 'foulsCommitted') || 0],
        yellowCards: [getStatVal(tHome, 'yellowCards') || 0, getStatVal(tAway, 'yellowCards') || 0],
        redCards: [getStatVal(tHome, 'redCards') || 0, getStatVal(tAway, 'redCards') || 0],
        offsides: [getStatVal(tHome, 'offsides') || 0, getStatVal(tAway, 'offsides') || 0],
        passes: [getStatVal(tHome, 'passes') || 300, getStatVal(tAway, 'passes') || 300],
        passAccuracy: [getStatVal(tHome, 'passAccuracy') || 80, getStatVal(tAway, 'passAccuracy') || 80],
      };
    }

    // Parse Key Timeline Events
    const events: MatchEvent[] = [];
    if (Array.isArray(raw.keyEvents)) {
      raw.keyEvents.forEach((ke: any, idx: number) => {
        const isGoal = Boolean(ke.scoringPlay);
        const isYellow = Boolean(ke.yellowCard);
        const isRed = Boolean(ke.redCard);
        const isSub = Boolean(ke.substitution);

        let type: MatchEvent['type'] = 'commentary';
        if (isGoal) type = 'goal';
        else if (isYellow) type = 'yellow_card';
        else if (isRed) type = 'red_card';
        else if (isSub) type = 'substitution';

        events.push({
          id: `espn-ev-${idx}-${Date.now()}`,
          minute: ke.clock?.value || 0,
          type,
          clubId: ke.team?.id || 'fbf',
          player: ke.participants?.[0]?.athlete?.displayName || undefined,
          description: ke.text || ke.shortText || '',
        });
      });
    }

    return {
      id: eventId,
      title,
      venue,
      homeLineup,
      awayLineup,
      stats,
      events,
    };
  }
}

export const espnFootballApi = new EspnFootballApiService();
