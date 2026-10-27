import type { LiveEvent } from '../types/football';
import { formatEventStart, scheduledAtOrNull } from '../utils/eventSchedule';
import { getMatchStatusInfo } from '../utils/matchStatus';

export function EventStartTime({ event }: { event?: LiveEvent | null }) {
  if (!event || (event.sports ? event.sports.state !== 'pre' : getMatchStatusInfo(event).category !== 'today')) return null;
  const date = scheduledAtOrNull(event.scheduledAt);
  return <p className="my-2 text-sm font-semibold text-sky-200">{date ? <>Inicio: <time dateTime={date}>{formatEventStart(date)}</time></> : 'Horario por confirmar'}</p>;
}
