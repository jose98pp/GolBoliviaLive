import React, { useState } from 'react';
import type { SportsEvent } from '../types/sports';
import { SPORTS_STATE_LABELS, sportsImage } from '../utils/sportsEvents';

function ParticipantImage({ name, url }: { name: string; url?: string }) {
  const [failed, setFailed] = useState('');
  const image = sportsImage(url);
  return <div className="relative w-16 h-20 sm:w-20 sm:h-24 shrink-0 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center text-slate-300 text-xl" aria-label={name}>
    {image && failed !== image ? <img src={image} alt={name} className="w-full h-full object-contain" loading="lazy" onError={() => setFailed(image)} /> : name.split(/\s+/).slice(0, 2).map(word => word[0]).join('')}
  </div>;
}
export function SportsScoreboard({ data }: { data: SportsEvent }) {
  const hasScores = data.sport !== 'mma';
  return <section className="rounded-2xl border border-slate-700 bg-slate-950 p-4 space-y-3" aria-label={`Marcador de ${data.competition}`}>
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2 min-w-0">{sportsImage(data.competitionLogo) && <img src={data.competitionLogo} alt={`Logo de ${data.competition}`} className="w-10 h-10 object-contain" onError={e => { e.currentTarget.hidden = true; }} />}<strong className="text-white break-words">{data.competition}</strong></div>
      <span className="text-xs text-emerald-300" role="status">{[SPORTS_STATE_LABELS[data.state], data.phase, data.clock].filter(Boolean).join(' · ')}</span>
    </div>
    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
      {data.participants.map((participant, index) => <React.Fragment key={index}>
        {index === 1 && <span className="text-slate-400 text-sm self-center">VS</span>}
        <div className="min-w-0 flex flex-col items-center text-center gap-2">
          <ParticipantImage name={participant.name} url={participant.imageUrl} />
          <strong className="text-sm sm:text-base text-white break-words">{participant.name}</strong>
          {hasScores && <span className="text-3xl font-black text-emerald-300 tabular-nums">{participant.score ?? '—'}</span>}
          {data.state === 'final' && participant.winner && <span className="text-xs font-bold text-amber-300">Ganador/a</span>}
        </div>
      </React.Fragment>)}
    </div>
    {data.result && <p className="text-sm text-slate-300 text-center break-words">{data.result}</p>}
    {data.source?.enabled && <p className="text-xs text-slate-400">ESPN · {data.syncedAt ? `Actualizado ${new Date(data.syncedAt).toLocaleTimeString()}` : 'Esperando actualización oficial'} · consulta cada 30 segundos</p>}
  </section>;
}
