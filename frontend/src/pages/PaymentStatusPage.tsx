// ============================================================
// PAYMENT STATUS PAGE — Visual status indicators
// PROMPT.txt §14.6
// ============================================================

import React, { useEffect, useState } from 'react';
import type { SubscriptionStatus } from '../types';
import { getSubscription } from '../services/api';
import { formatDate, daysUntil } from '../utils/formatters';
import { PaymentStatusBadge } from '../components/PaymentStatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface StatusCard {
  status: SubscriptionStatus;
  title: string;
  description: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
  actions: { label: string; href: string }[];
}

const STATUS_CARDS: StatusCard[] = [
  {
    status: 'active',
    title: 'Active',
    icon: '✓',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    description: 'Your subscription is in good standing. All features are available.',
    actions: [{ label: 'View Dashboard', href: '/dashboard' }],
  },
  {
    status: 'past_due',
    title: 'Past Due',
    icon: '⚠',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    description: 'A payment failed. We\'ll retry automatically within your grace period.',
    actions: [{ label: 'Update Payment', href: '/dashboard' }],
  },
  {
    status: 'grace_period',
    title: 'Grace Period',
    icon: '⏱',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    description: 'You have a 7-day grace period after a failed payment. Retries happen at days 1, 3, and 7.',
    actions: [{ label: 'Contact Support', href: '/dashboard' }],
  },
  {
    status: 'locked',
    title: 'Locked',
    icon: '🔒',
    color: 'text-red-400',
    bg: 'bg-red-600/10',
    border: 'border-red-600/20',
    description: 'Your account was locked after 3 failed payment attempts. Contact support to unlock.',
    actions: [{ label: 'Contact Support', href: '/dashboard' }],
  },
  {
    status: 'canceled',
    title: 'Canceled',
    icon: '✕',
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/20',
    description: 'Your subscription was canceled. You can resubscribe anytime.',
    actions: [{ label: 'View Plans', href: '/' }],
  },
];

export default function PaymentStatusPage() {
  const [currentStatus, setCurrentStatus] = useState<SubscriptionStatus | null>(null);
  const [nextRenewal, setNextRenewal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Payment Status — BillingHub';
    getSubscription()
      .then((sub) => {
        setCurrentStatus(sub.status);
        setNextRenewal(sub.next_renewal);
      })
      .catch(() => {
        // Demo: show active status
        setCurrentStatus('active');
        setNextRenewal(new Date(Date.now() + 18 * 86400000).toISOString());
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading payment status…" />
      </div>
    );
  }

  const activeCard = STATUS_CARDS.find((c) => c.status === currentStatus);
  const daysLeft = daysUntil(nextRenewal);

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="section-title">Payment Status</h1>
          <p className="section-subtitle">Real-time status of your subscription health</p>
        </div>

        {/* Current status hero */}
        {activeCard && (
          <div className={`glass-card p-6 mb-8 border ${activeCard.border} ${activeCard.bg}`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${activeCard.bg} border ${activeCard.border}`}>
                {activeCard.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h2 className={`text-2xl font-bold ${activeCard.color}`}>
                    {activeCard.title}
                  </h2>
                  <PaymentStatusBadge status={activeCard.status} size="md" />
                </div>
                <p className="text-gray-400">{activeCard.description}</p>
                {nextRenewal && currentStatus !== 'canceled' && (
                  <p className="text-sm text-gray-500 mt-2">
                    Next renewal: {formatDate(nextRenewal)} ({daysLeft} days)
                  </p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {activeCard.actions.map((act) => (
                  <a key={act.href} href={act.href} className="btn-primary text-sm">
                    {act.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Grace period retry timeline */}
        {(currentStatus === 'past_due' || currentStatus === 'grace_period') && (
          <div className="glass-card p-6 mb-8">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              Retry Schedule
            </h3>
            <div className="relative">
              <div className="absolute top-4 left-4 bottom-4 w-0.5 bg-white/10" />
              {[
                { day: 1,  label: 'Day 1', desc: 'First automatic retry', done: true },
                { day: 3,  label: 'Day 3', desc: 'Second retry attempt', done: false },
                { day: 7,  label: 'Day 7', desc: 'Final retry — lock if failed', done: false },
              ].map((step, i) => (
                <div key={i} className="relative flex items-start gap-4 mb-4 last:mb-0">
                  <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                    ${step.done ? 'bg-brand-600 text-white' : 'bg-white/10 text-gray-400'}`}>
                    {step.done ? '✓' : step.day}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className={`text-sm font-semibold ${step.done ? 'text-white' : 'text-gray-400'}`}>
                      {step.label} — {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All status reference */}
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Status Reference
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {STATUS_CARDS.map((card) => {
            const isCurrent = card.status === currentStatus;
            return (
              <div
                key={card.status}
                className={`glass-card p-4 transition-all duration-200
                  ${isCurrent ? `border-opacity-100 ${card.border} ${card.bg} ring-1 ring-inset ${card.border}` : 'opacity-60 hover:opacity-80'}
                `}
              >
                <div className="flex items-center gap-3 mb-2">
                  <PaymentStatusBadge status={card.status} size="sm" />
                  {isCurrent && (
                    <span className="text-xs text-gray-400 font-medium">← Current</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{card.description}</p>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-8 p-4 rounded-xl bg-white/3 border border-white/8">
          <p className="text-xs text-gray-500 leading-relaxed">
            <strong className="text-gray-400">How it works:</strong> Stripe sends webhooks on payment events.
            Failed payments trigger a 7-day grace period with 3 automatic retries (days 1, 3, 7).
            After 3 failures your account is locked and requires admin intervention to unlock.
          </p>
        </div>
      </div>
    </div>
  );
}
