// ============================================================
// PLANS PAGE — Grid of available plans with Subscribe flow
// PROMPT.txt §14.1
// ============================================================

import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import type { Plan } from '../types';
import { getPlans, createSubscription } from '../services/api';
import { formatCurrency, formatCycle } from '../utils/formatters';
import { SkeletonCard } from '../components/LoadingSpinner';
import { StripePaymentForm } from '../components/StripePaymentForm';
import { useToast } from '../components/Toast';

// stripe-mock compatible: any pk_test_... key works with localhost:12111
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? 'pk_test_12345');

// Demo plans rendered when API is unavailable
const DEMO_PLANS: Plan[] = [
  {
    id: 'plan_starter',
    stripe_price_id: 'price_starter',
    name: 'Starter',
    description: 'Perfect for individuals and small projects',
    amount_cents: 900,
    currency: 'usd',
    billing_cycle: 'monthly',
    features: ['1 Project', '5 GB Storage', 'Email Support', 'Basic Analytics'],
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'plan_pro',
    stripe_price_id: 'price_pro',
    name: 'Pro',
    description: 'For growing teams and businesses',
    amount_cents: 2900,
    currency: 'usd',
    billing_cycle: 'monthly',
    features: ['Unlimited Projects', '50 GB Storage', 'Priority Support', 'Advanced Analytics', 'API Access', 'Custom Domains'],
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'plan_enterprise',
    stripe_price_id: 'price_enterprise',
    name: 'Enterprise',
    description: 'For large organizations with custom needs',
    amount_cents: 9900,
    currency: 'usd',
    billing_cycle: 'monthly',
    features: ['Unlimited Everything', '1 TB Storage', 'Dedicated Support', 'Custom Analytics', 'SSO/SAML', 'SLA 99.99%', 'Custom Integrations', 'Audit Logs'],
    active: true,
    created_at: new Date().toISOString(),
  },
];

const POPULAR_PLAN_ID = 'plan_pro';

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [subscribedPlanId, setSubscribedPlanId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    document.title = 'Plans — BillingHub';
    getPlans()
      .then(setPlans)
      .catch(() => setPlans(DEMO_PLANS))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubscribe(planId: string) {
    const result = await createSubscription(planId);
    return result;
  }

  function handleSuccess(subscriptionId: string) {
    setSubscribedPlanId(selectedPlan?.id ?? null);
    setSelectedPlan(null);
    toast.success('Subscription created!', `Subscription ID: ${subscriptionId}`);
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Page header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-600/20 border border-brand-500/30 text-brand-300 text-sm font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse-slow" />
            Simple, transparent pricing
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Choose your <span className="text-brand-400">plan</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            Start free, scale when you need to. All plans include a 14-day trial.
            No credit card required to start.
          </p>
        </div>

        {/* Plans grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isPopular = plan.id === POPULAR_PLAN_ID;
              const isSubscribed = subscribedPlanId === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`relative glass-card p-6 flex flex-col transition-all duration-300 hover:border-white/20
                    ${isPopular ? 'border-brand-500/50 ring-1 ring-brand-500/30 shadow-lg shadow-brand-500/10' : ''}
                  `}
                >
                  {/* Popular badge */}
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-4 py-1 rounded-full bg-brand-600 text-white text-xs font-bold shadow-lg">
                        Most Popular
                      </span>
                    </div>
                  )}

                  {/* Plan header */}
                  <div className="mb-6">
                    <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center font-bold text-lg
                      ${isPopular ? 'bg-brand-600/30 text-brand-300' : 'bg-white/8 text-gray-300'}`}>
                      {plan.name[0]}
                    </div>
                    <h2 className="text-xl font-bold text-white">{plan.name}</h2>
                    {plan.description && (
                      <p className="text-sm text-gray-400 mt-1">{plan.description}</p>
                    )}
                  </div>

                  {/* Pricing */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-white">
                        {formatCurrency(plan.amount_cents)}
                      </span>
                      <span className="text-gray-400 text-sm">{formatCycle(plan.billing_cycle)}</span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="flex-1 space-y-2.5 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <span className={`mt-0.5 w-4 h-4 flex-shrink-0 rounded-full flex items-center justify-center text-xs
                          ${isPopular ? 'bg-brand-600/30 text-brand-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                          ✓
                        </span>
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <button
                    onClick={() => setSelectedPlan(plan)}
                    disabled={isSubscribed}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200
                      ${isSubscribed
                        ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 cursor-default'
                        : isPopular
                          ? 'btn-primary'
                          : 'btn-secondary'
                      }`}
                  >
                    {isSubscribed ? '✓ Subscribed' : 'Subscribe Now'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Trust indicators */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
          {['🔒 Stripe-secured payments', '✓ Cancel anytime', '📧 24/7 support', '↺ 7-day grace period'].map((item) => (
            <span key={item} className="flex items-center gap-1">{item}</span>
          ))}
        </div>
      </div>

      {/* Stripe Payment Modal */}
      {selectedPlan && (
        <Elements stripe={stripePromise}>
          <StripePaymentForm
            selectedPlan={selectedPlan}
            onSuccess={handleSuccess}
            onCancel={() => setSelectedPlan(null)}
            onSubmit={handleSubscribe}
          />
        </Elements>
      )}
    </div>
  );
}
