// ============================================================
// UPGRADE FLOW — Modal with FULL prorated billing breakdown
// Per PROMPT.txt §3 and UpgradeFlow spec in EXPECTED_INTERFACE.md
// ============================================================

import React, { useState, useEffect } from 'react';
import type { Plan } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface UpgradeFlowProps {
  currentPlan: Plan;
  availablePlans: Plan[];
  subscriptionId: string;
  currentPeriodEnd: string;
  onConfirm: (newPlanId: string) => Promise<void>;
  onCancel: () => void;
}

interface ProratedPreview {
  remainingDays: number;
  totalDays: number;
  unusedCredit: number;     // cents — refund from current plan
  newCharge: number;        // cents — cost of new plan for remaining days
  netCharge: number;        // cents — net to be charged immediately
}

function computePreview(
  currentPlan: Plan,
  newPlan: Plan,
  periodEnd: string
): ProratedPreview {
  const now = Date.now();
  const end = new Date(periodEnd).getTime();
  const totalMs = 30 * 24 * 60 * 60 * 1000; // approx month
  const remainingMs = Math.max(0, end - now);
  const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
  const totalDays = 30;

  const oldDaily = currentPlan.amount_cents / totalDays;
  const newDaily = newPlan.amount_cents / totalDays;

  const unusedCredit = Math.round(oldDaily * remainingDays);
  const newCharge = Math.round(newDaily * remainingDays);
  const netCharge = Math.max(0, newCharge - unusedCredit);

  return { remainingDays, totalDays, unusedCredit, newCharge, netCharge };
}

export function UpgradeFlow({
  currentPlan,
  availablePlans,
  subscriptionId,
  currentPeriodEnd,
  onConfirm,
  onCancel,
}: UpgradeFlowProps) {
  const upgradePlans = availablePlans.filter(
    (p) => p.active && p.amount_cents > currentPlan.amount_cents
  );

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(
    upgradePlans[0] ?? null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = selectedPlan
    ? computePreview(currentPlan, selectedPlan, currentPeriodEnd)
    : null;

  async function handleConfirm() {
    if (!selectedPlan) return;
    setLoading(true);
    setError(null);
    try {
      await onConfirm(selectedPlan.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upgrade failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay animate-fade-in" role="dialog" aria-modal="true" aria-label="Upgrade Plan">
      <div className="w-full max-w-2xl glass-card p-6 animate-slide-up overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Upgrade Your Plan</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Mid-cycle upgrade — you'll be charged the prorated difference immediately.
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

        {/* Plan selector */}
        {upgradePlans.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>You're already on the highest plan.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 mb-6">
              {upgradePlans.map((plan) => (
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
                      <p className="font-semibold text-white">{plan.name}</p>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {plan.features.slice(0, 2).join(' · ')}
                        {plan.features.length > 2 && ` · +${plan.features.length - 2} more`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-lg font-bold text-white">
                        {formatCurrency(plan.amount_cents)}
                      </p>
                      <p className="text-xs text-gray-400">
                        / {plan.billing_cycle === 'annual' ? 'year' : 'month'}
                      </p>
                    </div>
                  </div>
                  {selectedPlan?.id === plan.id && (
                    <div className="mt-2 flex items-center gap-1 text-brand-400 text-xs font-medium">
                      <span>✓</span> Selected
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* ─── PRORATED BILLING BREAKDOWN ─── */}
            {preview && selectedPlan && (
              <div className="mb-6 rounded-xl border border-white/10 overflow-hidden">
                {/* Section title */}
                <div className="px-5 py-3 bg-white/5 border-b border-white/10">
                  <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <span className="w-5 h-5 bg-brand-600/30 rounded flex items-center justify-center text-brand-400 text-xs">$</span>
                    Prorated Billing Breakdown
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {preview.remainingDays} days remaining this cycle ·{' '}
                    Period ends {formatDate(currentPeriodEnd)}
                  </p>
                </div>

                <div className="px-5 py-4 space-y-4">
                  {/* Step 1 — Current plan credit */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold">
                      1
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-200">
                            Unused Credit — <span className="text-gray-400">{currentPlan.name}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatCurrency(currentPlan.amount_cents)} ÷ {preview.totalDays} days × {preview.remainingDays} remaining days
                          </p>
                        </div>
                        <span className="text-emerald-400 font-bold text-sm tabular-nums">
                          +{formatCurrency(preview.unusedCredit)}
                        </span>
                      </div>
                      {/* Visual bar */}
                      <div className="mt-2 h-1.5 bg-white/8 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500/60 rounded-full"
                          style={{ width: `${(preview.remainingDays / preview.totalDays) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-600 mt-1">
                        <span>Start of cycle</span>
                        <span>{preview.remainingDays}d remaining</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/8" />

                  {/* Step 2 — New plan charge */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-600/15 border border-brand-500/30 flex items-center justify-center text-brand-400 text-xs font-bold">
                      2
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-200">
                            New Plan Charge — <span className="text-gray-400">{selectedPlan.name}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatCurrency(selectedPlan.amount_cents)} ÷ {preview.totalDays} days × {preview.remainingDays} remaining days
                          </p>
                        </div>
                        <span className="text-red-400 font-bold text-sm tabular-nums">
                          −{formatCurrency(preview.newCharge)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/8" />

                  {/* Net charge */}
                  <div className={`rounded-xl p-4 flex items-center justify-between
                    ${preview.netCharge > 0
                      ? 'bg-amber-500/10 border border-amber-500/25'
                      : 'bg-emerald-500/10 border border-emerald-500/25'
                    }`}
                  >
                    <div>
                      <p className={`text-base font-bold ${preview.netCharge > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                        {preview.netCharge > 0 ? 'Amount Due Today' : 'Net Credit Applied'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {preview.netCharge > 0
                          ? 'Charged immediately to your payment method'
                          : 'Credit applied to your next invoice'
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold tabular-nums ${preview.netCharge > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                        {formatCurrency(preview.netCharge)}
                      </p>
                      <p className="text-xs text-gray-500">+ tax if applicable</p>
                    </div>
                  </div>

                  {/* Formula legend */}
                  <div className="rounded-lg bg-white/3 px-4 py-2.5 text-xs text-gray-500 font-mono leading-loose">
                    <span className="text-gray-400">Formula: </span>
                    (new_plan_daily × remaining_days) − (old_plan_daily × remaining_days)
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
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
                  `Confirm Upgrade${preview ? ` — ${formatCurrency(preview.netCharge)}` : ''}`
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
