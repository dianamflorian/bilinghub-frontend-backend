// ============================================================
// DOWNGRADE FLOW — Modal for plan downgrade (next cycle)
// Per PROMPT.txt §2 — "Applied at next billing cycle"
// ============================================================

import React, { useState } from 'react';
import type { Plan } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface DowngradeFlowProps {
  currentPlan: Plan;
  availablePlans: Plan[];
  nextRenewalDate: string;
  onConfirm: (newPlanId: string) => Promise<void>;
  onCancel: () => void;
}

export function DowngradeFlow({
  currentPlan,
  availablePlans,
  nextRenewalDate,
  onConfirm,
  onCancel,
}: DowngradeFlowProps) {
  const downgradePlans = availablePlans.filter(
    (p) => p.active && p.amount_cents < currentPlan.amount_cents
  );

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(
    downgradePlans[0] ?? null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!selectedPlan) return;
    setLoading(true);
    setError(null);
    try {
      await onConfirm(selectedPlan.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Downgrade failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay animate-fade-in" role="dialog" aria-modal="true" aria-label="Downgrade Plan">
      <div className="w-full max-w-xl glass-card p-6 animate-slide-up overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Downgrade Plan</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Changes take effect at your next billing cycle.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Notice banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/25 mb-6">
          <span className="text-blue-400 text-lg flex-shrink-0">ℹ</span>
          <div>
            <p className="text-sm font-semibold text-blue-300">No Immediate Charges or Refunds</p>
            <p className="text-sm text-gray-400 mt-0.5">
              You'll keep full access to <strong className="text-gray-300">{currentPlan.name}</strong>{' '}
              until <strong className="text-gray-300">{formatDate(nextRenewalDate)}</strong>.
              The new plan starts on your next billing date.
            </p>
          </div>
        </div>

        {/* Current plan display */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Current Plan</p>
          <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between opacity-70">
            <div>
              <p className="font-semibold text-gray-300">{currentPlan.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">Active until {formatDate(nextRenewalDate)}</p>
            </div>
            <span className="text-gray-400 font-semibold">{formatCurrency(currentPlan.amount_cents)}/mo</span>
          </div>
        </div>

        {/* Plan selector */}
        <div className="mb-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Select New Plan</p>
        </div>

        {downgradePlans.length === 0 ? (
          <p className="text-center py-6 text-gray-400">You're already on the lowest plan.</p>
        ) : (
          <>
            <div className="grid gap-3 mb-6">
              {downgradePlans.map((plan) => {
                const savings = currentPlan.amount_cents - plan.amount_cents;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200
                      ${selectedPlan?.id === plan.id
                        ? 'border-brand-500 bg-brand-600/15 ring-1 ring-brand-500/50'
                        : 'border-white/10 bg-white/5 hover:border-white/25'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white flex items-center gap-2">
                          {plan.name}
                          {savings > 0 && (
                            <span className="text-xs font-normal text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                              Save {formatCurrency(savings)}/mo
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-400 mt-0.5">
                          {plan.features.slice(0, 2).join(' · ')}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-lg font-bold text-white">{formatCurrency(plan.amount_cents)}</p>
                        <p className="text-xs text-gray-400">
                          / {plan.billing_cycle === 'annual' ? 'year' : 'month'}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Effective date summary */}
            {selectedPlan && (
              <div className="mb-6 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-sm">
                <span className="text-gray-400">Effective date</span>
                <span className="text-white font-semibold">{formatDate(nextRenewalDate)}</span>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleConfirm}
                disabled={!selectedPlan || loading}
                className="btn-primary flex-1"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing…
                  </span>
                ) : (
                  `Confirm Downgrade to ${selectedPlan?.name ?? '…'}`
                )}
              </button>
              <button onClick={onCancel} className="btn-secondary" disabled={loading}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
