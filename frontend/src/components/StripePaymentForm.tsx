// ============================================================
// STRIPE PAYMENT FORM — Stripe Elements CardElement
// Uses stripe-mock in test/local env (pk_test_12345 / localhost:12111)
// No live Stripe API calls — all card interactions use simulated responses
// ============================================================

import React, { useState } from 'react';
import {
  useStripe,
  useElements,
  CardElement,
} from '@stripe/react-stripe-js';
import type { Plan } from '../types';
import { formatCurrency } from '../utils/formatters';

interface StripePaymentFormProps {
  selectedPlan: Plan;
  onSuccess: (subscriptionId: string) => void;
  onCancel: () => void;
  onSubmit: (planId: string) => Promise<{ subscription_id: string }>;
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#f1f5f9',
      fontFamily: '"Inter", sans-serif',
      fontSize: '15px',
      fontSmoothing: 'antialiased',
      '::placeholder': { color: '#64748b' },
      iconColor: '#94a3b8',
    },
    invalid: {
      color: '#f87171',
      iconColor: '#f87171',
    },
  },
};

export function StripePaymentForm({
  selectedPlan,
  onSuccess,
  onCancel,
  onSubmit,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card element not found.');
      setLoading(false);
      return;
    }

    // In a real implementation, we'd create a payment method and attach it
    // to the customer before calling the backend. For demo, we call the API directly.
    const { error: stripeError } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });

    if (stripeError) {
      setError(stripeError.message ?? 'Card validation failed.');
      setLoading(false);
      return;
    }

    try {
      const response = await onSubmit(selectedPlan.id);
      onSuccess(response.subscription_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay animate-fade-in" role="dialog" aria-modal="true" aria-label="Payment">
      <div className="w-full max-w-md glass-card p-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Subscribe to {selectedPlan.name}</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {formatCurrency(selectedPlan.amount_cents)} /{' '}
              {selectedPlan.billing_cycle === 'annual' ? 'year' : 'month'}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Plan summary */}
        <div className="mb-6 p-4 rounded-xl bg-brand-600/10 border border-brand-500/25">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600/30 flex items-center justify-center text-brand-400 font-bold text-lg flex-shrink-0">
              {selectedPlan.name[0]}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white">{selectedPlan.name}</p>
              <ul className="mt-1 space-y-0.5">
                {selectedPlan.features.slice(0, 3).map((f, i) => (
                  <li key={i} className="text-xs text-gray-400 flex items-center gap-1">
                    <span className="text-brand-400">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-brand-300 font-bold text-lg tabular-nums">
              {formatCurrency(selectedPlan.amount_cents)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Card holder name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Name on card
            </label>
            <input
              type="text"
              placeholder="Diana Florian"
              className="form-input"
              required
              autoComplete="cc-name"
            />
          </div>

          {/* Stripe CardElement */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Card details
            </label>
            <div className="stripe-card-element">
              <CardElement options={CARD_ELEMENT_OPTIONS} />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Stripe badge */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-5">
            <svg className="w-4 h-4" viewBox="0 0 40 16" fill="none">
              <path d="M2.9 6.4C2.9 5.2 3.9 4.7 5.5 4.7C7.8 4.7 10.6 5.4 12.9 6.5V2C10.5 1.1 8.1 0.7 5.5 0.7C2.2 0.7 0 2.4 0 6.6C0 13.1 8.8 12.1 8.8 14.8C8.8 16.2 7.6 16.7 5.9 16.7C3.4 16.7 0.3 15.7 -2 14.3V18.9C0.6 20 3.2 20.6 5.9 20.6C9.3 20.6 11.7 19.1 11.7 14.7C11.8 7.7 2.9 8.9 2.9 6.4Z" fill="#6772E5"/>
            </svg>
            Payments secured by <span className="font-semibold text-gray-400">Stripe</span>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!stripe || loading}
              className="btn-primary flex-1"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing…
                </span>
              ) : (
                `Pay ${formatCurrency(selectedPlan.amount_cents)}`
              )}
            </button>
            <button type="button" onClick={onCancel} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
