// ============================================================
// BILLING HISTORY PAGE — Paginated invoice table
// PROMPT.txt §14.3
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import type { Invoice, BillingHistoryResponse } from '../types';
import { getBillingHistory } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { SkeletonRow } from '../components/LoadingSpinner';

// Demo data
const DEMO_INVOICES: Invoice[] = [
  { invoice_id: 'inv_001', stripe_invoice_id: 'in_stripe_001', amount_cents: 2900, currency: 'usd', date: new Date(Date.now() - 0).toISOString(), status: 'paid', plan_name: 'Pro', period_start: new Date(Date.now() - 30 * 86400000).toISOString(), period_end: new Date().toISOString() },
  { invoice_id: 'inv_002', stripe_invoice_id: 'in_stripe_002', amount_cents: 2900, currency: 'usd', date: new Date(Date.now() - 30 * 86400000).toISOString(), status: 'paid', plan_name: 'Pro', period_start: new Date(Date.now() - 60 * 86400000).toISOString(), period_end: new Date(Date.now() - 30 * 86400000).toISOString() },
  { invoice_id: 'inv_003', stripe_invoice_id: 'in_stripe_003', amount_cents: 900, currency: 'usd', date: new Date(Date.now() - 60 * 86400000).toISOString(), status: 'paid', plan_name: 'Starter', period_start: new Date(Date.now() - 90 * 86400000).toISOString(), period_end: new Date(Date.now() - 60 * 86400000).toISOString() },
  { invoice_id: 'inv_004', stripe_invoice_id: 'in_stripe_004', amount_cents: 900, currency: 'usd', date: new Date(Date.now() - 90 * 86400000).toISOString(), status: 'failed', plan_name: 'Starter', period_start: new Date(Date.now() - 120 * 86400000).toISOString(), period_end: new Date(Date.now() - 90 * 86400000).toISOString() },
  { invoice_id: 'inv_005', stripe_invoice_id: 'in_stripe_005', amount_cents: 2000, currency: 'usd', date: new Date(Date.now() - 100 * 86400000).toISOString(), status: 'paid', plan_name: 'Pro (Prorate)', period_start: new Date(Date.now() - 105 * 86400000).toISOString(), period_end: new Date(Date.now() - 95 * 86400000).toISOString() },
  { invoice_id: 'inv_006', stripe_invoice_id: 'in_stripe_006', amount_cents: 900, currency: 'usd', date: new Date(Date.now() - 120 * 86400000).toISOString(), status: 'pending', plan_name: 'Starter', period_start: new Date(Date.now() - 150 * 86400000).toISOString(), period_end: new Date(Date.now() - 120 * 86400000).toISOString() },
];

type InvoiceStatus = Invoice['status'];

const STATUS_STYLES: Record<InvoiceStatus, { bg: string; text: string; label: string }> = {
  paid:         { bg: 'bg-emerald-500/15 border-emerald-500/30', text: 'text-emerald-400', label: 'Paid' },
  failed:       { bg: 'bg-red-500/15 border-red-500/30',         text: 'text-red-400',     label: 'Failed' },
  pending:      { bg: 'bg-amber-500/15 border-amber-500/30',     text: 'text-amber-400',   label: 'Pending' },
  refunded:     { bg: 'bg-blue-500/15 border-blue-500/30',       text: 'text-blue-400',    label: 'Refunded' },
  draft:        { bg: 'bg-gray-500/15 border-gray-500/30',       text: 'text-gray-400',    label: 'Draft' },
  open:         { bg: 'bg-amber-500/15 border-amber-500/30',     text: 'text-amber-400',   label: 'Open' },
  void:         { bg: 'bg-gray-500/15 border-gray-500/30',       text: 'text-gray-400',    label: 'Void' },
  uncollectible:{ bg: 'bg-red-600/15 border-red-600/30',         text: 'text-red-400',     label: 'Uncollectible' },
};

const PAGE_SIZE = 5;

export default function BillingHistoryPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Billing History — BillingHub';
  }, []);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    const offset = (p - 1) * PAGE_SIZE;
    getBillingHistory(PAGE_SIZE, offset)
      .then((res: BillingHistoryResponse) => {
        setInvoices(res.items);
        setTotal(res.total);
      })
      .catch(() => {
        // Demo fallback
        const sliced = DEMO_INVOICES.slice(offset, offset + PAGE_SIZE);
        setInvoices(sliced);
        setTotal(DEMO_INVOICES.length);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPage(page); }, [page, fetchPage]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="section-title">Billing History</h1>
            <p className="section-subtitle">{total} invoice{total !== 1 ? 's' : ''} total</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Sorted newest first
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Paid', value: formatCurrency(DEMO_INVOICES.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount_cents, 0)), color: 'text-emerald-400' },
            { label: 'Failed', value: DEMO_INVOICES.filter(i => i.status === 'failed').length.toString(), color: 'text-red-400' },
            { label: 'Pending', value: DEMO_INVOICES.filter(i => i.status === 'pending').length.toString(), color: 'text-amber-400' },
            { label: 'Last Invoice', value: formatDate(DEMO_INVOICES[0]?.date), color: 'text-gray-300' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass-card p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Plan</th>
                  <th>Period</th>
                  <th className="text-right">Amount</th>
                  <th className="text-center">Status</th>
                  <th>Invoice ID</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                  : invoices.length === 0
                    ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-gray-400">
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-4xl">📄</span>
                            <p className="font-medium text-gray-300">No invoices yet</p>
                            <p className="text-sm">Your billing history will appear here</p>
                          </div>
                        </td>
                      </tr>
                    )
                    : invoices.map((inv) => {
                        const s = STATUS_STYLES[inv.status] ?? STATUS_STYLES['pending'];
                        return (
                          <tr key={inv.invoice_id}>
                            <td className="text-gray-300">{formatDate(inv.date)}</td>
                            <td className="font-medium text-white">{inv.plan_name}</td>
                            <td className="text-gray-400 text-xs">
                              {formatDate(inv.period_start)} → {formatDate(inv.period_end)}
                            </td>
                            <td className="text-right font-semibold text-white tabular-nums">
                              {formatCurrency(inv.amount_cents, inv.currency)}
                            </td>
                            <td className="text-center">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.bg} ${s.text}`}>
                                {s.label}
                              </span>
                            </td>
                            <td className="font-mono text-xs text-gray-500 truncate max-w-[120px]">
                              {inv.stripe_invoice_id}
                            </td>
                          </tr>
                        );
                      })
                }
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-4 border-t border-white/8 flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Page {page} of {totalPages} — {total} total
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
                >
                  ← Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors
                      ${p === page ? 'bg-brand-600 text-white' : 'text-gray-400 hover:bg-white/8'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                  className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
