import React from 'react';
import { CardStatus, ClientStatus, BatchStatus } from '../../types';
import { CARD_STATUS_CONFIG, CLIENT_STATUS_CONFIG, BATCH_STATUS_CONFIG } from '../../lib/constants';

interface StatusBadgeProps {
  status: CardStatus | ClientStatus | BatchStatus | string;
  type?: 'card' | 'client' | 'batch';
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'card',
  size = 'md',
  className = '',
}) => {
  let color = 'text-slate-700';
  let bg = 'bg-slate-100';
  let border = 'border-slate-200';
  let dot = 'bg-slate-400';

  if (type === 'card' && CARD_STATUS_CONFIG[status as CardStatus]) {
    const cfg = CARD_STATUS_CONFIG[status as CardStatus];
    color = cfg.color;
    bg = cfg.bg;
    border = cfg.border;
    dot = cfg.dot;
  } else if (type === 'client' && CLIENT_STATUS_CONFIG[status as ClientStatus]) {
    const cfg = CLIENT_STATUS_CONFIG[status as ClientStatus];
    color = cfg.color;
    bg = cfg.bg;
    border = cfg.border;
    dot = cfg.color.includes('emerald') ? 'bg-emerald-500' : cfg.color.includes('amber') ? 'bg-amber-500' : 'bg-slate-400';
  } else if (type === 'batch' && BATCH_STATUS_CONFIG[status as BatchStatus]) {
    const cfg = BATCH_STATUS_CONFIG[status as BatchStatus];
    color = cfg.color;
    bg = cfg.bg;
    border = cfg.border;
    dot = cfg.color.includes('emerald') ? 'bg-emerald-500' : cfg.color.includes('sky') ? 'bg-sky-500' : 'bg-slate-400';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${sizeClasses} ${bg} ${color} ${border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
      {status}
    </span>
  );
};
