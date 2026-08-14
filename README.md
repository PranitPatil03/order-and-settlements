# CrossVal

CrossVal is a focused order-operations workspace for creating customer orders, tracking balances, collecting payments, and keeping a clear audit trail.

The project is implemented as a pnpm monorepo with a Next.js frontend, an Express REST API, MongoDB persistence, Stripe Checkout, and Resend email delivery.

## Contents

- [Product overview](#product-overview)
- [Requirements](#requirements)
- [Repository structure](#repository-structure)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Running the project](#running-the-project)
- [Core workflows](#core-workflows)
- [Business rules](#business-rules)
- [API overview](#api-overview)
- [Stripe and webhook setup](#stripe-and-webhook-setup)
- [Email delivery](#email-delivery)
- [Testing and validation](#testing-and-validation)
- [Deployment](#deployment)
- [Architecture decisions](#architecture-decisions)
- [Known limitations and production improvements](#known-limitations-and-production-improvements)

## Product overview

CrossVal supports the complete order-to-payment workflow:

1. An authenticated operator creates an order.
2. The order contains a customer, due date, and one or more line items.
3. The server calculates each line total and the order total.
4. The operator can create a public payment link.
5. The customer opens the link and pays through Stripe Checkout.
6. Stripe confirms the payment through a signed webhook.
7. CrossVal records the payment, updates the balance and status, and sends a confirmation email.
8. Operators can review payments, refunds, status changes, and audit history.

The root route (`/`) is an authentication-first landing page. Workspace routes require an authenticated session. Public payment links are intentionally separate from the operator workspace.

## Requirements

- Node.js 22 LTS or a supported Node version in the range `>=22 <25`.
- pnpm 10 or newer.
- MongoDB, either locally or through MongoDB Atlas.
- A Stripe account and API keys for payment checkout.
- A Resend account and verified sender domain for email delivery.

## Repository structure

```text
CrossVal/
├── apps/
│   ├── api/                  # Express API and MongoDB access
│   │   └── src/
│   │       ├── auth/         # Better Auth integration and middleware
│   │       ├── common/       # Errors, logging, middleware, utilities
│   │       ├── config/       # Environment, CORS, database, validators
│   │       ├── domain/       # Pure order totals and status rules
│   │       ├── modules/      # Customers, orders, payments, refunds, audit
│   │       └── services/     # Stripe and email integrations
│   └── web/                  # Next.js App Router frontend
│       └── src/
│           ├── app/          # Routes and page entry points
│           ├── components/   # Shared shell, auth, orders, payment UI
│           └── lib/          # API client, auth client, formatting helpers
├── packages/
│   └── shared/               # Shared workspace package
├── railway.toml              # Railway API deployment configuration
├── vercel.json               # Vercel frontend deployment configuration
└── pnpm-workspace.yaml
```

## Local setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure the API

```bash
cp apps/api/.env.example apps/api/.env
```

Set the values in `apps/api/.env`. Never commit this file or expose its secrets in the frontend.

### 3. Configure the frontend

```bash
cp apps/web/.env.example apps/web/.env.local
```

For local development, the frontend should point to the API at `http://localhost:4000`.

### 4. Start both applications

```bash
pnpm dev
```

The default local URLs are:

- Frontend: `http://localhost:3000`
- API: `http://localhost:4000`
- API health check: `http://localhost:4000/health`

## Environment variables

### API: `apps/api/.env`

| Variable                | Required    | Description                                                                    |
| ----------------------- | ----------- | ------------------------------------------------------------------------------ |
| `NODE_ENV`              | Yes         | `development`, `test`, or `production`.                                        |
| `PORT`                  | Yes         | API port, normally `4000`.                                                     |
| `MONGODB_URI`           | Yes         | MongoDB connection string.                                                     |
| `MONGODB_DB_NAME`       | Yes         | Database name, normally `orders_and_settlements`.                              |
| `BETTER_AUTH_SECRET`    | Yes         | Random secret with at least 32 characters.                                     |
| `BETTER_AUTH_URL`       | Yes         | Public API/auth origin.                                                        |
| `WEB_ORIGIN`            | Yes         | Frontend origin allowed by CORS and auth.                                      |
| `PUBLIC_APP_URL`        | Recommended | Public frontend URL used in Stripe redirect links. Falls back to `WEB_ORIGIN`. |
| `STRIPE_SECRET_KEY`     | For Stripe  | Server-only Stripe secret key, normally `sk_test_...` or `sk_live_...`.        |
| `STRIPE_WEBHOOK_SECRET` | For Stripe  | Signing secret from Stripe CLI or Dashboard, normally `whsec_...`.             |
| `RESEND_API_KEY`        | For email   | Resend API key.                                                                |
| `RESEND_FROM_EMAIL`     | For email   | Verified sender address.                                                       |
| `APP_NAME`              | Yes         | Application name used in email templates.                                      |
| `DEFAULT_CURRENCY`      | Yes         | Default three-letter currency code, normally `USD`.                            |

### Frontend: `apps/web/.env.local`

| Variable                             | Required | Description                                                                          |
| ------------------------------------ | -------- | ------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_API_URL`                | Yes      | Express API URL, for example `http://localhost:4000`.                                |
| `NEXT_PUBLIC_APP_URL`                | Optional | Frontend URL used by client-side configuration.                                      |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional | Reserved for client-side Stripe integrations. Checkout currently starts server-side. |

## Running the project

```bash
# Start development servers
pnpm dev

# Build all packages
pnpm build

# Typecheck all packages
pnpm typecheck

# Check formatting
pnpm format:check

# Format the repository
pnpm format
```

The API and frontend can also be run independently:

```bash
pnpm --filter @orders-and-settlements/api dev
pnpm --filter @orders-and-settlements/web dev
```

## Core workflows

### Authentication

CrossVal uses Better Auth with email and password authentication. Auth routes are handled by the Express API, while the frontend uses the Better Auth React client with cookie credentials.

- `/` - authentication-first landing page
- `/login` - sign in
- `/signup` - create an account
- `/orders` and other workspace routes - authenticated only

Every authenticated API request is scoped to the current user. A user cannot read or modify another user's customers, orders, payments, refunds, or audit logs.

### Creating an order

An order includes:

- Customer name or saved customer ID
- Currency
- Due date
- One or more line items

Each line item includes a description, quantity, and unit price. The server calculates `lineTotalCents`, `subtotalCents`, and `totalCents`; clients do not control the final totals.

### Taking payment

Operators can record internal payments through the authenticated payments endpoint. Public customers use Stripe Checkout through a payment link. A public payment is not considered complete when Checkout opens; the signed Stripe webhook is the source of truth.

Large orders may require multiple Stripe Checkout payments because Stripe enforces a per-transaction amount limit. CrossVal prevents a request above the configured safe checkout limit and explains that the balance can be paid in multiple payments.

### Refunds and audit history

Refunds are stored as separate records and reduce the order's net paid amount. Status changes are written to the audit log with timestamps. The order detail screen links to payment history, refund history, and the lifecycle audit view.

## Business rules

### Totals

```text
line total = quantity × unit price
subtotal = sum of all line totals
order total = subtotal
amount due = max(order total - (gross paid - refunds), 0)
```

All monetary values are stored as integer cents (or the smallest currency unit).

### Status derivation

| Status           | Rule                                                            |
| ---------------- | --------------------------------------------------------------- |
| `pending`        | Net paid amount is zero and the order is not overdue.           |
| `partially_paid` | Net paid amount is greater than zero but below the order total. |
| `paid`           | Net paid amount is greater than or equal to the order total.    |
| `overdue`        | The due date has passed and the order is not fully paid.        |

An overdue order becomes `paid` as soon as its net paid amount reaches the order total. A paid order remains paid even if its original due date has passed.

### Payment validation

- Payment amounts must be positive.
- A payment cannot exceed the current remaining balance.
- Multiple payments are allowed.
- Payment writes use MongoDB transactions and idempotency keys.
- A duplicate request with the same idempotency key returns the original payment instead of creating a second record.

### Edit and delete policy

Orders become financially read-only after their first payment or refund. Line items and totals cannot be changed after financial activity. Orders with financial activity cannot be deleted. This protects historical payment and audit records.

## API overview

All operator endpoints require the Better Auth session cookie unless stated otherwise. Responses use the following shape:

```json
{
  "data": {},
  "error": null
}
```

Errors use a consistent shape:

```json
{
  "error": {
    "code": "PAYMENT_EXCEEDS_BALANCE",
    "message": "Payment exceeds the remaining order balance.",
    "details": {
      "maximumAllowedCents": 60000
    },
    "requestId": "..."
  }
}
```

### System and auth

```text
GET  /health
GET  /api/me
POST /api/auth/sign-up/email
POST /api/auth/sign-in/email
POST /api/auth/sign-out
```

Better Auth owns the exact auth request handling and session cookie behavior.

### Customers

```text
GET    /api/customers
POST   /api/customers
GET    /api/customers/:customerId
PATCH  /api/customers/:customerId
DELETE /api/customers/:customerId
```

### Orders

```text
GET    /api/orders
POST   /api/orders
GET    /api/orders/:orderId
PATCH  /api/orders/:orderId
DELETE /api/orders/:orderId
GET    /api/orders/export?from=YYYY-MM-DD&to=YYYY-MM-DD
POST   /api/orders/:orderId/payment-link
DELETE /api/orders/:orderId/payment-link
```

### Payments, refunds, and audit

```text
GET  /api/orders/:orderId/payments
POST /api/orders/:orderId/payments
GET  /api/orders/:orderId/refunds
POST /api/orders/:orderId/refunds
GET  /api/orders/:orderId/audit-logs
```

### Public Stripe payment links

```text
GET  /api/public/payment-links/:token
POST /api/public/payment-links/:token/checkout-session
POST /api/webhooks/stripe
```

The public token is an opaque, deterministic HMAC-derived identifier. The customer-facing link does not expose a separate access-code form. The webhook endpoint validates the Stripe signature before recording `checkout.session.completed` payments.

## Stripe and webhook setup

### Test mode

1. Create a Stripe test-mode secret key.
2. Put it in `apps/api/.env` as `STRIPE_SECRET_KEY`.
3. Start the API.
4. Authenticate the Stripe CLI:

   ```bash
   stripe login
   ```

5. Forward local webhook events:

   ```bash
   stripe listen --forward-to localhost:4000/api/webhooks/stripe
   ```

6. Copy the displayed `whsec_...` value into `STRIPE_WEBHOOK_SECRET`.
7. Restart the API after changing environment variables.

Use Stripe's test card `4242 4242 4242 4242` with any future expiry date and any three-digit CVC.

Do not use an expired CLI API key, and do not confuse `sk_test_...` secret keys with `whsec_...` webhook secrets.

## Email delivery

CrossVal uses Resend when both `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are configured.

Emails include:

- CrossVal brand header
- Clear subject with the order identifier
- Customer name
- Order line items and totals
- Due date and amount due
- Secure Stripe payment link
- Payment amount and updated remaining balance for confirmations
- Support guidance and application signature

Email failure is logged without rolling back order creation. Payment recording remains authoritative in MongoDB and Stripe webhook retries remain idempotent.

## Testing and validation

Run API tests:

```bash
pnpm --filter @orders-and-settlements/api test
```

Run typechecks:

```bash
pnpm --filter @orders-and-settlements/api typecheck
pnpm --filter @orders-and-settlements/web typecheck
```

Current automated coverage includes:

- Order total calculations
- Pending, partially paid, paid, and overdue status rules
- Remaining balance after refunds
- Payment-link token stability
- Customer schema validation
- Order edit/delete policies after financial activity
- Payment overage and idempotency logic through domain/service tests

The frontend should also be manually smoke-tested at `/`, `/login`, `/signup`, `/orders`, `/customers`, `/orders/new`, an order detail route, refund history, audit history, and a public payment link.

## Deployment

The repository includes deployment configuration for Railway and Vercel.

### Railway API

Create a Railway service from the repository root. The included `railway.toml` builds and starts the API package.

Required production variables:

```text
NODE_ENV=production
PORT=4000
MONGODB_URI=<MongoDB Atlas connection string>
MONGODB_DB_NAME=orders_and_settlements
BETTER_AUTH_SECRET=<random secret with at least 32 characters>
BETTER_AUTH_URL=https://<railway-api-domain>
WEB_ORIGIN=https://<vercel-frontend-domain>
PUBLIC_APP_URL=https://<vercel-frontend-domain>
STRIPE_SECRET_KEY=<Stripe live or test secret key>
STRIPE_WEBHOOK_SECRET=<Stripe webhook signing secret>
RESEND_API_KEY=<Resend API key>
RESEND_FROM_EMAIL=<verified sender email>
APP_NAME=CrossVal
DEFAULT_CURRENCY=USD
```

Configure the Stripe webhook destination as:

```text
https://<railway-api-domain>/api/webhooks/stripe
```

Subscribe at minimum to `checkout.session.completed`.

### Vercel frontend

Create the Vercel project from the repository root and configure:

```text
NEXT_PUBLIC_API_URL=https://<railway-api-domain>
NEXT_PUBLIC_APP_URL=https://<vercel-frontend-domain>
```

After the first deployment, verify that the final Vercel origin is present in the API's `WEB_ORIGIN` and that browser requests include credentials.

### Deployment URL

Add the final public frontend URL here before submitting the project:

```text
Production URL: <add deployed frontend URL>
API URL: <add deployed API URL>
```

## Architecture decisions

### Server-authoritative money rules

The frontend sends user input, but the API calculates totals, validates balances, and derives status. This prevents clients from changing financial facts through modified requests.

### Transactional payment writes

Payment creation increments the order's paid total and inserts the payment record inside a MongoDB transaction. A unique `(userId, idempotencyKey)` index prevents duplicate payment records during retries.

### Webhook as payment authority

Stripe Checkout sessions are not recorded as payments merely because a session was created. Only a verified `checkout.session.completed` webhook records the payment. This avoids marking abandoned or cancelled checkouts as paid.

### User ownership boundaries

Every repository query includes the authenticated user's ID. Public payment links resolve only the order associated with their opaque token and never expose operator-only workspace data.

### Graceful integrations

Stripe and Resend are optional at application startup so the workspace can run for local order-management development. Payment checkout returns a clear configuration error when Stripe is unavailable, and email delivery failures are logged.

## Known limitations and production improvements

Before a larger production rollout, the following improvements would be appropriate:

- Add browser end-to-end tests for authentication, order creation, payment links, and Stripe webhook flows.
- Add a durable email outbox so a temporary email provider outage can be retried independently.
- Add webhook event storage for stronger replay and operational visibility.
- Add pagination and server-side filtering to customer and order list endpoints.
- Add role-based access control for multiple finance operators.
- Add rate limiting and abuse protection for public payment-link endpoints.
- Add stronger observability with metrics, alerting, and structured payment reconciliation reports.
- Add a production secret manager instead of manually maintained environment variables.
- Add a supported database migration process for schema evolution.
- Add a documented live URL and deployment smoke-test checklist to the submission package.

## License

This project is provided as an assignment/demo application. Add the appropriate license before public redistribution.
