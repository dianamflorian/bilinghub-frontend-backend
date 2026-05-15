# BillingHub — deterministic Billing System

## MANDATORY AUDITOR CONSTRAINTS
- **JWT ONLY**: Authentication MUST use JSON Web Tokens (JWT). Sessions are STRICTLY PROHIBITED.
- **EMAIL ONLY**: ALL system notifications REQUIRED to be sent via Email only. No on-platform inbox.
- **MODALS ONLY**: Upgrade and Downgrade flows MUST be implemented exclusively via Modals.
- **PERIOD END**: Stripe cancellations MUST use `cancel_at_period_end=True`.
- **BLOCKING TRIGGER**: Account locking MUST be triggered uniquely by `invoice.payment_failed`.

---

## Expected Interface

| Path | Name | Type | Input | Output | Description |
|------|------|------|-------|--------|-------------|
| `backend/models.py` | `User` | Model | `id, email, name, locked` | User Instance | Modelo de usuario con flag de bloqueo por impago. |
| `backend/models.py` | `Subscription` | Model | `id, stripe_id, status` | Sub Instance | Almacena el estado de Stripe: active, past_due, etc. |
| `backend/parsing.py` | `calculate_proration` | Function | `sub_id, new_plan_id` | JSON (Estimate) | Source of Truth: Stripe API. Devuelve el prorrata de Stripe. |
| `backend/parsing.py` | `handle_webhook` | Function | Stripe Event Object | 200 OK / 400 Error | Procesa `invoice.payment_failed` y firma de Stripe. |
| `backend/jobs.py` | `daily_reconciliation` | Job | None (Cron 02:00 UTC) | ReconciliationLog | Compara DB local vs Stripe API y auto-corrige. |
| `api/subscriptions` | `create_sub` | POST | `{plan_id: string}` | `{id, status, url}` | Crea cliente y sub en Stripe. Requiere JWT. |
| `api/admin/billing` | `get_admin_data` | GET | `status, page, limit` | `{customers[], total}` | Lista de clientes con cursor-based pagination. |
| `frontend/src/types` | `index.ts` | File | None | TypeScript Interfaces | Espejo exacto de los modelos y respuestas del Backend. |
| `frontend/src/api` | `api.ts` | File | Axios Instance | Exported Methods | Cliente API centralizado con interceptores JWT. |
| `components/` | `PaymentStatusBadge` | Component | `status: string` | JSX Badge | Indicador visual de estado de pago (active, past_due, locked, etc). |

---

## Project Structure
- `/backend`: Flask API + Stripe integration logic.
- `/frontend`: React + Vite + Tailwind UI.
- `/db`: PostgreSQL migrations.

## Tech Stack
- **Framework**: React 18, Vite.
- **Styling**: Tailwind CSS (Deterministic utility-first).
- **Stripe**: Stripe Elements + stripe-mock (pk_test_12345).
- **Auth**: JWT Bearer Auth (localStorage).
