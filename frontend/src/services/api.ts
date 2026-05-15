// ============================================================
// API SERVICE — Connects frontend to Flask backend.
// MANDATORY: JWT ONLY. Sessions ARE STRICTLY PROHIBITED.
// REQUIRED: All endpoints MUST align with Expected Interface.
// ============================================================

import axios, { AxiosError } from 'axios';
import type {
  Plan,
  Subscription,
  BillingHistoryResponse,
  CreateSubscriptionResponse,
  UpgradeResponse,
  DowngradeResponse,
  CancelResponse,
  AdminBillingResponse,
  AdminFilters,
  UnlockResponse,
  ReconciliationStatus,
} from '../types';

// ---- Axios instance ----

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach JWT token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize error responses
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const msg =
      (err.response?.data as { error?: string })?.error ||
      err.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(msg));
  }
);

// ---- Plans ----

/**
 * GET /api/plans — Retrieve all available plans
 * (Inferred from PROMPT.txt §1 — Plan Management)
 */
export async function getPlans(): Promise<Plan[]> {
  const { data } = await api.get<Plan[]>('/plans');
  return data;
}

// ---- Subscriptions ----

/**
 * POST /api/subscriptions — Create subscription
 * Input: { plan_id }
 * Output: CreateSubscriptionResponse
 */
export async function createSubscription(
  planId: string
): Promise<CreateSubscriptionResponse> {
  const { data } = await api.post<CreateSubscriptionResponse>('/subscriptions', {
    plan_id: planId,
  });
  return data;
}

/**
 * GET /api/subscriptions — Get current user's subscription (JWT required)
 * Output: Subscription
 */
export async function getSubscription(): Promise<Subscription> {
  const { data } = await api.get<Subscription>('/subscriptions');
  return data;
}

/**
 * POST /api/subscriptions/{id}/upgrade — Upgrade plan (mid-cycle prorated)
 * Input: { new_plan_id }
 * Output: UpgradeResponse with prorated breakdown
 */
export async function upgradeSubscription(
  subscriptionId: string,
  newPlanId: string
): Promise<UpgradeResponse> {
  const { data } = await api.post<UpgradeResponse>(
    `/subscriptions/${subscriptionId}/upgrade`,
    { new_plan_id: newPlanId }
  );
  return data;
}

/**
 * POST /api/subscriptions/{id}/downgrade — Downgrade plan (next cycle)
 * Input: { new_plan_id }
 * Output: DowngradeResponse
 */
export async function downgradeSubscription(
  subscriptionId: string,
  newPlanId: string
): Promise<DowngradeResponse> {
  const { data } = await api.post<DowngradeResponse>(
    `/subscriptions/${subscriptionId}/downgrade`,
    { new_plan_id: newPlanId }
  );
  return data;
}

/**
 * POST /api/subscriptions/{id}/cancel — Cancel subscription
 * Output: CancelResponse
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<CancelResponse> {
  const { data } = await api.post<CancelResponse>(
    `/subscriptions/${subscriptionId}/cancel`
  );
  return data;
}

// ---- Billing History ----

/**
 * GET /api/billing/history — Paginated invoice list (JWT required)
 * Params: limit (default 20), offset (default 0)
 */
export async function getBillingHistory(
  limit = 20,
  offset = 0
): Promise<BillingHistoryResponse> {
  const { data } = await api.get<BillingHistoryResponse>('/billing/history', {
    params: { limit, offset },
  });
  return data;
}

// ---- Admin ----

/**
 * GET /api/admin/billing — List all customers (admin JWT required)
 * Supports filters: status, plan, search, limit, page
 */
export async function getAdminBilling(
  filters: AdminFilters = {}
): Promise<AdminBillingResponse> {
  const { data } = await api.get<AdminBillingResponse>('/admin/billing', {
    params: filters,
  });
  return data;
}

/**
 * POST /api/admin/users/{id}/unlock — Unlock locked account (admin)
 */
export async function unlockUser(userId: string): Promise<UnlockResponse> {
  const { data } = await api.post<UnlockResponse>(
    `/admin/users/${userId}/unlock`
  );
  return data;
}

/**
 * GET /api/admin/reconciliation/status — Reconciliation job status (admin)
 */
export async function getReconciliationStatus(): Promise<ReconciliationStatus> {
  const { data } = await api.get<ReconciliationStatus>(
    '/admin/reconciliation/status'
  );
  return data;
}

// ---- Auth helpers ----

export function setAuthToken(token: string): void {
  localStorage.setItem('jwt_token', token);
}

export function clearAuthToken(): void {
  localStorage.removeItem('jwt_token');
}

export function getAuthToken(): string | null {
  return localStorage.getItem('jwt_token');
}
