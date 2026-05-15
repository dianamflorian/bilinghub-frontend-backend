// ============================================================
// LOADING SPINNER + SKELETON VARIANTS
// ============================================================

import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const SIZE_MAP = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
const BORDER_MAP = { sm: 'border-2', md: 'border-2', lg: 'border-3' };

export function LoadingSpinner({ size = 'md', label = 'Loading…' }: SpinnerProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-12"
      role="status"
      aria-label={label}
    >
      <div
        className={`${SIZE_MAP[size]} ${BORDER_MAP[size]} border-brand-500 border-t-transparent rounded-full animate-spin`}
      />
      {label && <p className="text-gray-400 text-sm">{label}</p>}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-card p-6 animate-pulse space-y-4">
      <div className="h-4 bg-white/10 rounded-full w-2/3" />
      <div className="h-8 bg-white/10 rounded-full w-1/3" />
      <div className="space-y-2">
        <div className="h-3 bg-white/8 rounded-full w-full" />
        <div className="h-3 bg-white/8 rounded-full w-5/6" />
        <div className="h-3 bg-white/8 rounded-full w-4/5" />
      </div>
      <div className="h-10 bg-white/10 rounded-xl w-full" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <tr className="border-t border-white/5 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-3 bg-white/8 rounded-full" style={{ width: `${60 + i * 7}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function FullPageLoader({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" label={message} />
    </div>
  );
}
