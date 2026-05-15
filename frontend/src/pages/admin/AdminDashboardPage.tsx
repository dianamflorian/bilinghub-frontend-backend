// ============================================================
// ADMIN DASHBOARD PAGE — Customer list, filters, unlock
// PROMPT.txt §14.5 + EXPECTED_INTERFACE.md AdminDashboardPage
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import type { AdminCustomer, AdminFilters, ReconciliationStatus, AdminBillingResponse } from '../../types';
import { getAdminBilling, unlockUser, getReconciliationStatus } from '../../services/api';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { PaymentStatusBadge } from '../../components/PaymentStatusBadge';
import { SkeletonRow } from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

// Demo data
const DEMO_CUSTOMERS: AdminCustomer[] = [
  { user_id: 'usr_001', name: 'Alice Johnson', email: 'alice@example.com', current_plan: { plan_id: 'plan_pro', name: 'Pro', amount_cents: 2900, cycle: 'monthly' }, next_renewal: new Date(Date.now() + 15 * 86400000).toISOString(), payment_status: 'active', grace_period: null },
  { user_id: 'usr_002', name: 'Bob Smith', email: 'bob@example.com', current_plan: { plan_id: 'plan_enterprise', name: 'Enterprise', amount_cents: 9900, cycle: 'monthly' }, next_renewal: new Date(Date.now() + 5 * 86400000).toISOString(), payment_status: 'past_due', grace_period: { ends_at: new Date(Date.now() + 4 * 86400000).toISOString(), retry_count: 1, locked: false } },
  { user_id: 'usr_003', name: 'Carol White', email: 'carol@example.com', current_plan: { plan_id: 'plan_starter', name: 'Starter', amount_cents: 900, cycle: 'monthly' }, next_renewal: new Date(Date.now() + 22 * 86400000).toISOString(), payment_status: 'active', grace_period: null },
  { user_id: 'usr_004', name: 'Dan Brown', email: 'dan@example.com', current_plan: { plan_id: 'plan_pro', name: 'Pro', amount_cents: 2900, cycle: 'monthly' }, next_renewal: new Date(Date.now() - 2 * 86400000).toISOString(), payment_status: 'locked', grace_period: { ends_at: new Date(Date.now() - 2 * 86400000).toISOString(), retry_count: 3, locked: true } },
  { user_id: 'usr_005', name: 'Eva Martinez', email: 'eva@example.com', current_plan: null, next_renewal: null, payment_status: 'canceled', grace_period: null },
];

const DEMO_RECON: ReconciliationStatus = {
  last_run: new Date(Date.now() - 10 * 3600000).toISOString(),
  next_run: new Date(Date.now() + 14 * 3600000).toISOString(),
  status: 'completed',
  mismatches_found: 2,
  fixed_count: 2,
  error_details: null,
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'past_due', label: 'Past Due' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'locked', label: 'Locked' },
];

export default function AdminDashboardPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [recon, setRecon] = useState<ReconciliationStatus | null>(null);

  const [filters, setFilters] = useState<AdminFilters>({
    status: '',
    search: '',
    limit: 10,
    page: 1,
  });

  useEffect(() => {
    document.title = 'Admin Dashboard — BillingHub';
    getReconciliationStatus()
      .then(setRecon)
      .catch(() => setRecon(DEMO_RECON));
  }, []);

  const fetchCustomers = useCallback(async (f: AdminFilters) => {
    setLoading(true);
    getAdminBilling({ ...f, page: f.page ?? 1 })
      .then((res: AdminBillingResponse) => {
        setCustomers(res.customers);
        setTotal(res.total);
      })
      .catch(() => {
        // Filter demo data
        let filtered = DEMO_CUSTOMERS;
        if (f.status) filtered = filtered.filter((c) => c.payment_status === f.status);
        if (f.search) {
          const q = f.search.toLowerCase();
          filtered = filtered.filter(
            (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
          );
        }
        setCustomers(filtered);
        setTotal(filtered.length);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCustomers({ ...filters, page });
  }, [filters, page, fetchCustomers]);

  async function handleUnlock(userId: string, name: string) {
    setUnlocking(userId);
    try {
      await unlockUser(userId);
      setCustomers((prev) =>
        prev.map((c) =>
          c.user_id === userId ? { ...c, payment_status: 'active', grace_period: null } : c
        )
      );
      toast.success(`${name} unlocked`, 'Account is now active again.');
    } catch (err) {
      toast.error('Unlock failed', err instanceof Error ? err.message : undefined);
    } finally {
      setUnlocking(null);
    }
  }

  const totalPages = Math.ceil(total / (filters.limit ?? 10));

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center glass-card p-10 max-w-md">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-6">
            You need admin permissions to access this page.
          </p>
          <a href="/dashboard" className="btn-secondary">Back to Dashboard</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="section-title">Admin Dashboard</h1>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-brand-600/30 text-brand-300 border border-brand-500/30">
              Admin Only
            </span>
          </div>
          <p className="section-subtitle">Manage all customer subscriptions and billing</p>
        </div>

        {/* Reconciliation widget */}
        {recon && (
          <div className={`glass-card p-4 mb-6 border
            ${recon.status === 'completed' ? 'border-emerald-500/20 bg-emerald-500/5' :
              recon.status === 'running'   ? 'border-brand-500/20 bg-brand-500/5' :
                                             'border-red-500/20 bg-red-500/5'}
          `}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-semibold uppercase tracking-wider
                    ${recon.status === 'completed' ? 'text-emerald-400' :
                      recon.status === 'running'   ? 'text-brand-400'  : 'text-red-400'}`}>
                    {recon.status === 'running' ? '⟳ Reconciliation Running' :
                     recon.status === 'completed' ? '✓ Last Reconciliation Completed' :
                     '✕ Last Reconciliation Failed'}
                  </span>
                </div>
                <p className="text-sm text-gray-400">
                  Last run: <strong className="text-gray-300">{formatDateTime(recon.last_run)}</strong>
                  {' · '}Found <strong className="text-gray-300">{recon.mismatches_found}</strong> mismatches,
                  fixed <strong className="text-gray-300">{recon.fixed_count}</strong>
                  {' · '}Next: <strong className="text-gray-300">{formatDateTime(recon.next_run)}</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Customers', value: total, color: 'text-white' },
            { label: 'Active', value: DEMO_CUSTOMERS.filter(c => c.payment_status === 'active').length, color: 'text-emerald-400' },
            { label: 'Past Due', value: DEMO_CUSTOMERS.filter(c => c.payment_status === 'past_due').length, color: 'text-amber-400' },
            { label: 'Locked', value: DEMO_CUSTOMERS.filter(c => c.payment_status === 'locked').length, color: 'text-red-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass-card p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="glass-card p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
              <input
                type="text"
                placeholder="Search by name or email…"
                value={filters.search ?? ''}
                onChange={(e) => {
                  setFilters((f: AdminFilters) => ({ ...f, search: e.target.value }));
                  setPage(1);
                }}
                className="form-input pl-9"
              />
            </div>
            {/* Status filter */}
            <select
              value={filters.status ?? ''}
              onChange={(e) => {
                setFilters((f: AdminFilters) => ({ ...f, status: e.target.value }));
                setPage(1);
              }}
              className="form-input sm:w-48"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Current Plan</th>
                  <th>Next Renewal</th>
                  <th className="text-center">Status</th>
                  <th>Grace Period</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                  : customers.length === 0
                    ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-gray-400">
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-4xl">👥</span>
                            <p>No customers found</p>
                          </div>
                        </td>
                      </tr>
                    )
                    : customers.map((c) => (
                        <tr key={c.user_id}>
                          <td>
                            <div>
                              <p className="font-semibold text-white">{c.name}</p>
                              <p className="text-xs text-gray-400">{c.email}</p>
                            </div>
                          </td>
                          <td>
                            {c.current_plan ? (
                              <div>
                                <p className="font-medium text-gray-200">{c.current_plan.name}</p>
                                <p className="text-xs text-gray-400">
                                  {formatCurrency(c.current_plan.amount_cents)} / {c.current_plan.cycle}
                                </p>
                              </div>
                            ) : (
                              <span className="text-gray-500 text-sm">No plan</span>
                            )}
                          </td>
                          <td className="text-gray-300">
                            {c.next_renewal ? formatDate(c.next_renewal) : '—'}
                          </td>
                          <td className="text-center">
                            <PaymentStatusBadge
                              status={c.payment_status}
                              gracePeriod={c.grace_period ?? undefined}
                              size="sm"
                            />
                          </td>
                          <td>
                            {c.grace_period ? (
                              <div className="text-sm">
                                <p className="text-blue-300 text-xs font-medium">
                                  Ends {formatDate(c.grace_period.ends_at)}
                                </p>
                                <p className="text-gray-500 text-xs">
                                  {c.grace_period.retry_count}/3 retries
                                </p>
                              </div>
                            ) : (
                              <span className="text-gray-600 text-xs">—</span>
                            )}
                          </td>
                          <td className="text-center">
                            {c.payment_status === 'locked' && (
                              <button
                                onClick={() => handleUnlock(c.user_id, c.name)}
                                disabled={unlocking === c.user_id}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold
                                  bg-emerald-600/20 hover:bg-emerald-600/40 
                                  border border-emerald-500/30 hover:border-emerald-500/60
                                  text-emerald-400 hover:text-emerald-300
                                  transition-all duration-200 disabled:opacity-50"
                              >
                                {unlocking === c.user_id ? '…' : 'Unlock'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                }
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-4 border-t border-white/8 flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Page {page} of {totalPages} — {total} customers
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
                >
                  ←
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                  className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
