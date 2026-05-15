// ============================================================
// SHARED TYPESCRIPT INTERFACES — Billing & Payments System
// ============================================================

/** Billing plan (Pro, Enterprise, etc.) */
export interface Plan {
  id: string;
  stripe_price_id: string;
  name: string;
  description?: string;
  amount_cents: number;
  currency: string;
  billing_cycle: 'monthly' | 'annual';
  features: string[];
  active: boolean;
  created_at: string;
}

/** User subscription */
export interface Subscription {
  subscription_id: string;
  plan_name: string;
  plan_amount_cents: number;
  status: SubscriptionStatus;
  next_renewal: string;
  billing_cycle: 'monthly' | 'annual';
  stripe_subscription_id: string;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
}

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'unpaid' | 'locked' | 'grace_period';

/** Invoice / billing history item */
export interface Invoice {
  invoice_id: string;
  stripe_invoice_id: string;
  amount_cents: number;
  currency: string;
  date: string;
  status: InvoiceStatus;
  plan_name: string;
  period_start: string;
  period_end: string;
}

export type InvoiceStatus = 'paid' | 'failed' | 'pending' | 'refunded' | 'draft' | 'open' | 'void' | 'uncollectible';

/** Paginated billing history response */
export interface BillingHistoryResponse {
  items: Invoice[];
  total: number;
  hasMore: boolean;
}

/** Grace period info */
export interface GracePeriod {
  ends_at: string | null;
  retry_count: number;
  locked: boolean;
}

/** Admin customer entry */
export interface AdminCustomer {
  user_id: string;
  name: string;
  email: string;
  current_plan: {
    plan_id: string;
    name: string;
    amount_cents: number;
    cycle: string;
  } | null;
  next_renewal: string | null;
  payment_status: SubscriptionStatus;
  grace_period: GracePeriod | null;
}

/** Admin billing dashboard response */
export interface AdminBillingResponse {
  customers: AdminCustomer[];
  total: number;
  page: number;
}

/** Admin billing filters */
export interface AdminFilters {
  status?: string;
  plan?: string;
  search?: string;
  limit?: number;
  page?: number;
}

/** Reconciliation status */
export interface ReconciliationStatus {
  last_run: string | null;
  next_run: string;
  status: 'running' | 'completed' | 'failed';
  mismatches_found: number;
  fixed_count: number;
  error_details: string | null;
}

/** Upgrade response with prorated breakdown */
export interface UpgradeResponse {
  subscription_id: string;
  old_plan_name: string;
  new_plan_name: string;
  prorated_credit_cents: number;
  prorated_charge_cents: number;
  net_charge_cents: number;
  effective_date: string;
}

/** Downgrade response */
export interface DowngradeResponse {
  subscription_id: string;
  old_plan_name: string;
  new_plan_name: string;
  effective_date: string;
  refund_status: 'none' | 'pending';
}

/** Cancel response */
export interface CancelResponse {
  subscription_id: string;
  status: string;
  cancellation_date: string;
  ends_at: string;
}

/** Create subscription response */
export interface CreateSubscriptionResponse {
  subscription_id: string;
  status: string;
  next_renewal: string;
  amount_cents: number;
  stripe_subscription_id: string;
  url?: string;
}

/** Unlock user response */
export interface UnlockResponse {
  user_id: string;
  locked: boolean;
  unlocked_at: string;
}

/** Auth user info (from JWT) */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
}

/** API error shape */
export interface ApiError {
  error: string;
  code?: string;
  details?: string;
}
