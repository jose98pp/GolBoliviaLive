import React, { useEffect, useState } from 'react';

export interface FloatingItem {
  id: string;
  emoji: string;
  leftPercent: number;
}

interface FloatingReactionsProps {
  reactions: FloatingItem[];
  onRemove: (id: string) => void;
}

export const FloatingReactions: React.FC<FloatingReactionsProps> = ({ reactions, onRemove }) => {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {reactions.map((r) => (
        <div
          key={r.id}
          onAnimationEnd={() => onRemove(r.id)}
          className="absolute bottom-24 text-3xl select-none animate-float-up"
          style={{ left: `${r.leftPercent}%` }}
        >
          {r.emoji}
        </div>
      ))}
    </div>
  );
};
