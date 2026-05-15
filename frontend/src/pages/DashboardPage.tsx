// ============================================================
// DASHBOARD PAGE — Current subscription + status + actions
// PROMPT.txt §14.2
// ============================================================

import React, { useEffect, useState } from 'react';
import type { Plan, Subscription } from '../types';
import { getSubscription, getPlans, cancelSubscription, upgradeSubscription, downgradeSubscription } from '../services/api';
import { formatCurrency, formatDate, daysUntil } from '../utils/formatters';
import { PaymentStatusBadge } from '../components/PaymentStatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { UpgradeFlow } from '../components/UpgradeFlow';
import { DowngradeFlow } from '../components/DowngradeFlow';
import { useToast } from '../components/Toast';

// Demo fallback subscription
const DEMO_SUBSCRIPTION: Subscription = {
  subscription_id: 'sub_demo_001',
  plan_name: 'Pro',
  plan_amount_cents: 2900,
  status: 'active',
  next_renewal: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
  billing_cycle: 'monthly',
  stripe_subscription_id: 'sub_stripe_demo',
  current_period_start: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
  current_period_end: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
};

const DEMO_PLANS: Plan[] = [
  {
    id: 'plan_starter', stripe_price_id: 'price_starter', name: 'Starter',
    amount_cents: 900, currency: 'usd', billing_cycle: 'monthly',
    features: ['1 Project', '5 GB Storage', 'Email Support'],
    active: true, created_at: new Date().toISOString(),
  },
  {
    id: 'plan_pro', stripe_price_id: 'price_pro', name: 'Pro',
    amount_cents: 2900, currency: 'usd', billing_cycle: 'monthly',
    features: ['Unlimited Projects', '50 GB Storage', 'Priority Support', 'API Access'],
    active: true, created_at: new Date().toISOString(),
  },
  {
    id: 'plan_enterprise', stripe_price_id: 'price_enterprise', name: 'Enterprise',
    amount_cents: 9900, currency: 'usd', billing_cycle: 'monthly',
    features: ['Unlimited Everything', '1 TB Storage', 'Dedicated Support', 'SLA 99.99%'],
    active: true, created_at: new Date().toISOString(),
  },
];

type Flow = 'upgrade' | 'downgrade' | null;

export default function DashboardPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFlow, setActiveFlow] = useState<Flow>(null);
  const [canceling, setCanceling] = useState(false);
  const toast = useToast();

  useEffect(() => {
    document.title = 'Dashboard — BillingHub';
    Promise.all([
      getSubscription().catch(() => DEMO_SUBSCRIPTION),
      getPlans().catch(() => DEMO_PLANS),
    ]).then(([sub, ps]) => {
      setSubscription(sub);
      setPlans(ps);
      setLoading(false);
    });
  }, []);

  const currentPlan = plans.find((p) => p.name === subscription?.plan_name) ?? null;
  const daysLeft = daysUntil(subscription?.next_renewal);

  async function handleCancel() {
    if (!subscription) return;
    if (!window.confirm('Are you sure you want to cancel your subscription?')) return;
    setCanceling(true);
    try {
      await cancelSubscription(subscription.subscription_id);
      setSubscription({ ...subscription, status: 'canceled' });
      toast.info('Subscription canceled', 'Access continues until the end of your billing period.');
    } catch (err) {
      toast.error('Cancel failed', err instanceof Error ? err.message : undefined);
    } finally {
      setCanceling(false);
    }
  }

  async function handleUpgradeConfirm(newPlanId: string) {
    if (!subscription) return;
    await upgradeSubscription(subscription.subscription_id, newPlanId);
    const newPlan = plans.find((p) => p.id === newPlanId);
    if (newPlan) {
      setSubscription({ ...subscription, plan_name: newPlan.name, plan_amount_cents: newPlan.amount_cents });
    }
    setActiveFlow(null);
    toast.success('Plan upgraded!', 'Your new plan is now active.');
  }

  async function handleDowngradeConfirm(newPlanId: string) {
    if (!subscription) return;
    await downgradeSubscription(subscription.subscription_id, newPlanId);
    setActiveFlow(null);
    toast.info('Downgrade scheduled', 'Your plan change takes effect at next renewal.');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading your subscription…" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center glass-card p-10 max-w-md">
          <div className="text-5xl mb-4">📦</div>
          <h2 className="text-xl font-bold text-white mb-2">No active subscription</h2>
          <p className="text-gray-400 mb-6">You don't have an active plan yet. Browse our plans to get started.</p>
          <a href="/" className="btn-primary">View Plans</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="section-title">My Dashboard</h1>
          <p className="section-subtitle">Manage your subscription and billing</p>
        </div>

        {/* Status alert for locked/past_due */}
        {(subscription.status === 'locked' || subscription.status === 'past_due') && (
          <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3
            ${subscription.status === 'locked'
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-amber-500/10 border-amber-500/30'
            }`}>
            <span className="text-2xl flex-shrink-0">
              {subscription.status === 'locked' ? '🔒' : '⚠️'}
            </span>
            <div>
              <p className={`font-semibold ${subscription.status === 'locked' ? 'text-red-300' : 'text-amber-300'}`}>
                {subscription.status === 'locked'
                  ? 'Account Locked — Payment Failed'
                  : 'Payment Past Due'}
              </p>
              <p className="text-sm text-gray-400 mt-0.5">
                {subscription.status === 'locked'
                  ? 'Your account has been locked after multiple failed payment attempts. Please contact support.'
                  : 'Your last payment failed. We\'ll retry within the grace period.'}
              </p>
            </div>
          </div>
        )}

        {/* Main subscription card */}
        <div className="glass-card p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold text-white">{subscription.plan_name}</h2>
                <PaymentStatusBadge status={subscription.status} size="md" />
              </div>
              <p className="text-gray-400 text-sm mt-1">
                {formatCurrency(subscription.plan_amount_cents)} /{''}
                {subscription.billing_cycle === 'annual' ? 'year' : 'month'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Stripe ID</p>
              <p className="text-xs text-gray-400 font-mono mt-0.5 truncate max-w-[200px]">
                {subscription.stripe_subscription_id}
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Next Renewal</p>
              <p className="text-lg font-bold text-white">{formatDate(subscription.next_renewal)}</p>
              <p className="text-xs text-gray-400 mt-0.5">In {daysLeft} days</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Billing Cycle</p>
              <p className="text-lg font-bold text-white capitalize">{subscription.billing_cycle}</p>
              <p className="text-xs text-gray-400 mt-0.5">Auto-renews</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Amount</p>
              <p className="text-lg font-bold text-white">{formatCurrency(subscription.plan_amount_cents)}</p>
              <p className="text-xs text-gray-400 mt-0.5">+ tax if applicable</p>
            </div>
          </div>

          {/* Renewal timeline */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{formatDate(subscription.current_period_start)}</span>
              <span>{formatDate(subscription.next_renewal)}</span>
            </div>
            <div className="h-2 bg-white/8 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, 100 - (daysLeft / 30) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{daysLeft} days remaining in current cycle</p>
          </div>

          {/* Action buttons */}
          {subscription.status !== 'canceled' && (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActiveFlow('upgrade')}
                className="btn-primary"
                disabled={canceling}
              >
                ↑ Upgrade Plan
              </button>
              <button
                onClick={() => setActiveFlow('downgrade')}
                className="btn-secondary"
                disabled={canceling}
              >
                ↓ Downgrade Plan
              </button>
              <button
                onClick={handleCancel}
                className="btn-danger ml-auto"
                disabled={canceling}
              >
                {canceling ? 'Canceling…' : 'Cancel Subscription'}
              </button>
            </div>
          )}

          {(subscription.status === 'canceled' || subscription.cancel_at_period_end) && (
            <div className="p-3 rounded-xl bg-gray-500/10 border border-gray-500/20 text-gray-400 text-sm text-center">
              {subscription.cancel_at_period_end 
                ? 'Your subscription is scheduled to end. Access continues until ' 
                : 'Your subscription was canceled. Access continues until '}
              <strong className="text-gray-300">{formatDate(subscription.next_renewal)}</strong>.
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a href="/billing" className="glass-card p-4 hover:border-white/20 transition-colors group flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600/20 flex items-center justify-center text-brand-400 group-hover:bg-brand-600/30 transition-colors">
              📄
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Billing History</p>
              <p className="text-xs text-gray-400">View all invoices</p>
            </div>
          </a>
          <a href="/status" className="glass-card p-4 hover:border-white/20 transition-colors group flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/25 transition-colors">
              ◉
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Payment Status</p>
              <p className="text-xs text-gray-400">Check payment health</p>
            </div>
          </a>
        </div>
      </div>

      {/* Upgrade modal */}
      {activeFlow === 'upgrade' && currentPlan && (
        <UpgradeFlow
          currentPlan={currentPlan}
          availablePlans={plans}
          subscriptionId={subscription.subscription_id}
          currentPeriodEnd={subscription.current_period_end ?? subscription.next_renewal}
          onConfirm={handleUpgradeConfirm}
          onCancel={() => setActiveFlow(null)}
        />
      )}

      {/* Downgrade modal */}
      {activeFlow === 'downgrade' && currentPlan && (
        <DowngradeFlow
          currentPlan={currentPlan}
          availablePlans={plans}
          nextRenewalDate={subscription.next_renewal}
          onConfirm={handleDowngradeConfirm}
          onCancel={() => setActiveFlow(null)}
        />
      )}
    </div>
  );
}
