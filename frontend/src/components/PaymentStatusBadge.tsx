// ============================================================
// PAYMENT STATUS BADGE — color-coded status indicator
// ============================================================

import React from 'react';
import type { SubscriptionStatus, GracePeriod } from '../types';

interface PaymentStatusBadgeProps {
  status: SubscriptionStatus;
  gracePeriod?: GracePeriod | null;
  size?: 'sm' | 'md' | 'lg';
}

const STATUS_CONFIG: Record<
  SubscriptionStatus,
  { label: string; bg: string; text: string; dot: string; icon: string }
> = {
  active: {
    label: 'Active',
    bg: 'bg-emerald-500/15 border-emerald-500/30',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
    icon: '●',
  },
  past_due: {
    label: 'Past Due',
    bg: 'bg-amber-500/15 border-amber-500/30',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
    icon: '⚠',
  },
  canceled: {
    label: 'Canceled',
    bg: 'bg-gray-500/15 border-gray-500/30',
    text: 'text-gray-400',
    dot: 'bg-gray-400',
    icon: '✕',
  },
  unpaid: {
    label: 'Unpaid',
    bg: 'bg-red-500/15 border-red-500/30',
    text: 'text-red-400',
    dot: 'bg-red-400',
    icon: '✕',
  },
  locked: {
    label: 'Locked',
    bg: 'bg-red-600/20 border-red-600/40',
    text: 'text-red-400',
    dot: 'bg-red-500',
    icon: '🔒',
  },
  grace_period: {
    label: 'Grace Period',
    bg: 'bg-blue-500/15 border-blue-500/30',
    text: 'text-blue-400',
    dot: 'bg-blue-400',
    icon: '⏱',
  },
};

const SIZE_CLASSES = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

export function PaymentStatusBadge({
  status,
  gracePeriod,
  size = 'md',
}: PaymentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG['active'];
  const sizeClass = SIZE_CLASSES[size];

  const isGrace = status === 'grace_period' || (gracePeriod && !gracePeriod.locked);

  const displayStatus: SubscriptionStatus = isGrace ? 'grace_period' : status;
  const displayConfig = STATUS_CONFIG[displayStatus];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${displayConfig.bg} ${displayConfig.text} ${sizeClass}`}
      role="status"
      aria-label={`Payment status: ${displayConfig.label}`}
    >
      {/* Animated dot for active */}
      {displayStatus === 'active' ? (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${displayConfig.dot} opacity-50`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${displayConfig.dot}`} />
        </span>
      ) : (
        <span className={`inline-flex rounded-full h-2 w-2 ${displayConfig.dot}`} />
      )}
      {displayConfig.label}
      {/* Grace period extra info */}
      {isGrace && gracePeriod && (
        <span className="ml-0.5 opacity-75 font-normal">
          ({gracePeriod.retry_count}/3 retries)
        </span>
      )}
    </span>
  );
}
