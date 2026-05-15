// ============================================================
// UTILITY FORMATTERS
// ============================================================

/**
 * Format cents to USD string  e.g. 9900 → "$99.00"
 */
export function formatCurrency(cents: number, currency = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Format ISO date string to readable format e.g. "2026-03-18" → "Mar 18, 2026"
 */
export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

/**
 * Format ISO date with time  e.g. "Mar 18, 2026 at 8:04 PM"
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

/**
 * Format billing cycle label
 */
export function formatCycle(cycle: string): string {
  return cycle === 'annual' ? 'per year' : 'per month';
}

/**
 * Days remaining until a date
 */
export function daysUntil(isoString: string | null | undefined): number {
  if (!isoString) return 0;
  const diff = new Date(isoString).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Truncate long strings
 */
export function truncate(str: string, max = 32): string {
  return str.length > max ? `${str.slice(0, max)}…` : str;
}
