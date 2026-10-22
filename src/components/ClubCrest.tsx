import React, { useState } from 'react';
import type { Club } from '../types/football';
import { getClubCrestUrl } from '../utils/clubCrests';

export function ClubCrest({ club, className = 'w-6 h-6' }: { club?: Partial<Club>; className?: string }) {
  const [failedUrl, setFailedUrl] = useState('');
  const source = getClubCrestUrl(club);
  const name = club?.name || 'Equipo';
  if (source && source !== failedUrl) return <img src={source} alt={`Escudo de ${name}`} loading="lazy" decoding="async"
    className={`inline-block shrink-0 object-contain ${className}`} onError={() => setFailedUrl(source)} />;
  const initials = (club?.shortName || name).split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  return <svg role="img" aria-label={`Equipo ${name}, sin escudo disponible`} viewBox="0 0 48 56" className={`inline-block shrink-0 ${className}`}>
    <path d="M3 3h42v25c0 12-12 21-21 25C15 49 3 40 3 28Z" fill={club?.primaryColor || '#334155'} stroke={club?.secondaryColor || '#cbd5e1'} strokeWidth="3" />
    <text x="24" y="32" textAnchor="middle" fontSize="17" fontFamily="system-ui" fontWeight="bold" fill={club?.textColor || '#ffffff'}>{initials}</text>
  </svg>;
}
