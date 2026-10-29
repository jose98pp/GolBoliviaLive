import React, { useState } from 'react';
import { normalizeChannelLogoUrl } from '../utils/channelLogos';

export function ChannelLogo({ src, name, className = 'w-16 h-12' }: { src?: string; name: string; className?: string }) {
  const source = normalizeChannelLogoUrl(src);
  const [failed, setFailed] = useState('');
  const initials = name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'TV';
  return <span className={`${className} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-600 bg-slate-100 p-1.5`}>
    {source && source !== failed ? <img src={source} alt={name} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-full w-full object-contain" style={{ filter: 'drop-shadow(0 0 1px #334155)' }} onError={() => setFailed(source)} /> : <span role="img" aria-label={`Logo no disponible: ${name}`} className="text-sm font-bold text-slate-700">{initials}</span>}
  </span>;
}
