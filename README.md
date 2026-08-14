# Orders and Settlements

Monorepo for the CrossVal orders and settlements take-home assignment.

## Workspace

- `apps/api`: Express and TypeScript REST API.
- `apps/web`: Next.js frontend using shadcn/ui.
- `packages/shared`: Shared schemas and types.

Copy `apps/api/.env.example` to `apps/api/.env` and `apps/web/.env.example` to `apps/web/.env.local` before starting the apps. The web app's `NEXT_PUBLIC_API_URL` must point to the Express API (`http://localhost:4000`), because Better Auth is mounted by Express rather than Next.js.

For local development, set `MONGODB_URI` to your MongoDB Atlas connection string and set `MONGODB_DB_NAME` to `orders_and_settlements`. Database credentials belong only in the ignored `apps/api/.env` file and must never be committed.

With pnpm 11, native dependency build scripts are explicitly allowlisted in `pnpm-workspace.yaml`. This project allows `esbuild` and `sharp`, which are required by the Next.js toolchain.

## Requirements

- Node.js 22 LTS or newer within the supported range.
- pnpm 11.

## Testing

Run the full API test suite with:

```bash
pnpm --filter @orders-and-settlements/api test
```

Run type checking for the full workspace with:

```bash
pnpm typecheck
```

The current backend tests cover:

- Order total and status derivation.
- Remaining-balance calculations after refunds.
- Payment-link token and access-code generation.
- Public payment-link access-code validation.
- Order edit/delete locking after financial activity.

There is no browser E2E suite in the repository; the frontend is verified by typecheck and manual route smoke testing.

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm typecheck
pnpm format:check
```

The API runs on `http://localhost:4000` and the web app runs on the Next.js development port. Restart the dev server after changing `NEXT_PUBLIC_API_URL`, because Next.js bundles public environment variables at startup.

## Deployment

The repository includes `railway.toml` for the Express API and `vercel.json` for the Next.js frontend.

### Railway API

Create a Railway service from this repository and set these variables:

```text
NODE_ENV=production
PORT=4000
MONGODB_URI=<MongoDB Atlas connection string>
MONGODB_DB_NAME=orders_and_settlements
BETTER_AUTH_SECRET=<random secret of at least 32 characters>
BETTER_AUTH_URL=https://<railway-api-domain>
WEB_ORIGIN=https://<vercel-frontend-domain>
```

Railway uses the repository `railway.toml`, builds the API package, starts `dist/server.js`, and checks `/health`.

### Vercel frontend

Import the same repository into Vercel and set:

```text
NEXT_PUBLIC_API_URL=https://<railway-api-domain>
```

The Vercel project must use the repository root so the workspace lockfile and `vercel.json` are available. After the first deploy, copy the Vercel production URL into Railway's `WEB_ORIGIN`, then redeploy the API. The deployed URL should be added to this README and the submission email.

## API foundation

The API uses route, controller, service, domain, and repository layers. Orders are scoped by the authenticated user, line-item totals are calculated on the server, and order status is derived from totals and the UTC due date.

Customer endpoints:

```text
GET    /api/customers
POST   /api/customers
GET    /api/customers/:customerId
PATCH  /api/customers/:customerId
DELETE /api/customers/:customerId
```

Order endpoints currently include:

```text
GET    /api/orders
POST   /api/orders
GET    /api/orders/:orderId
PATCH  /api/orders/:orderId
DELETE /api/orders/:orderId
POST   /api/orders/:orderId/payment-link
DELETE /api/orders/:orderId/payment-link
GET    /api/orders/:orderId/refunds
POST   /api/orders/:orderId/refunds
GET    /api/orders/:orderId/audit-logs
GET    /api/orders/export?from=YYYY-MM-DD&to=YYYY-MM-DD
```

Line items and prices become read-only after the first payment or refund. Orders with financial activity cannot be deleted.

### Payment meaning

Payments are settlement records owned by the authenticated user who created the order. That user is the finance operator, not the payer. When an order is created from a saved customer, the order stores both `customerId` and the current customer display name. The customer can pay through the protected public payment link, while internal payment recording remains available for manual back-office settlement.

Public payments use Stripe Checkout. The API creates a card-only Checkout Session and only the verified Stripe webhook records a successful payment.

### Customer payment links

An authenticated order owner can call `POST /api/orders/:orderId/payment-link`. The API derives a stable high-entropy opaque token from the order ID and server secret, stores its SHA-256 hash, and returns a URL such as `http://localhost:3000/pay/<token>`. Repeatedly copying the link returns the same URL. `DELETE` revokes the link.

When an order is created with a saved customer, the backend automatically creates the payment link and attempts to send a payment request email through Resend. Email delivery is intentionally graceful: if Resend is not configured or the email request fails, the order still exists and the error is logged for the operator.

The public page calls:

```text
GET  /api/public/payment-links/:token
POST /api/public/payment-links/:token/checkout-session
```

The public response exposes the customer name, line items, currency, due date, totals, current balance, and payment history for the opaque link. The customer selects a partial or full amount, is redirected to Stripe Checkout, and the page polls for updated payment history every 10 seconds. A verified Stripe webhook records the payment against the order owner's account and sends a confirmation email.

## How the API works

An authenticated request flows through the API in this order:

```text
HTTP request
  -> CORS, Helmet, request ID, and structured logging
  -> Better Auth session middleware
  -> route and Zod request schema
  -> controller: HTTP input/output only
  -> service: use-case orchestration
  -> domain functions: totals and status rules
  -> repository: ownership-scoped MongoDB queries
  -> consistent JSON response
```

The controller does not calculate money and does not query MongoDB directly. The service validates the use case, calls pure domain functions, and asks the repository to persist data. This keeps financial rules easy to test and prevents HTTP concerns from leaking into the business layer.

Refunds are stored in a separate append-only collection. A refund can never exceed the order's gross paid amount minus previous refunds, and it uses the same idempotency pattern as payments. Status changes caused by payment or refund activity are written to the append-only `audit_logs` collection. CSV export is ownership-scoped and streams the current order summary fields for an optional inclusive date range.

The order detail dashboard links to separate refund and audit sections. Refund history supports creating a simple refund against paid amount. Audit history is read-only; there is no delete or update endpoint for audit records.

Concurrency is handled with transactional payment and refund writes plus atomic balance checks in the repository layer. If two payments race for the same remaining balance, one transaction may fail with `PAYMENT_EXCEEDS_BALANCE` rather than over-allocating funds.

## MongoDB schema

MongoDB is flexible by default, so this project uses two layers of schema protection:

1. Zod validates API input before it reaches the service.
2. MongoDB creates the `orders` collection with a strict `$jsonSchema` validator in `apps/api/src/config/mongo-schema.ts`.

The collection is created on API startup before indexes are created. The current order document is:

```text
orders
├── _id: ObjectId
├── userId: string
├── customerId: string | null
├── customer: string
├── dueDate: YYYY-MM-DD string
├── currency: 3-letter string
├── lineItems: [{ description, quantity, unitPriceCents, lineTotalCents }]
├── subtotalCents: integer
├── totalCents: integer
├── grossPaidCents: integer
├── refundedTotalCents: integer
├── deletedAt: Date | null
├── createdAt: Date
└── updatedAt: Date
```

Money is stored as integer cents. For example, `$1,000.50` is `100050`. The server calculates `lineTotalCents`, `subtotalCents`, and `totalCents`; the client cannot override them.

Indexes:

```text
{ userId: 1, createdAt: -1 }
{ userId: 1, dueDate: 1 }
{ userId: 1, customerId: 1, createdAt: -1 }
{ paymentLinkTokenHash: 1 } unique, partial on string token hashes
```

The `userId` condition is included in every order repository query, which prevents one authenticated user from reading or modifying another user's data.

The `customers` collection uses a partial unique index on `{ userId, email }` where `deletedAt` is `null`, so one user cannot create two active customers with the same email, while soft-deleted records do not block recreating that contact later.

## Payments

Payment endpoints:

```text
GET  /api/orders/:orderId/payments
POST /api/orders/:orderId/payments
```

Recording a payment requires an `Idempotency-Key` header:

```http
Idempotency-Key: payment-request-unique-id
```

The request body is:

```json
{
  "amountCents": 40000,
  "paidAt": "2026-08-13T12:00:00.000Z",
  "note": "Deposit"
}
```

The payment write is transactional:

```text
validate request
  -> check idempotency key
  -> atomically increment order.grossPaidCents if gross paid remains <= total plus refunded amount
  -> insert immutable payment document
  -> commit transaction
```

If the balance condition fails, the transaction is aborted and the API returns `409 PAYMENT_EXCEEDS_BALANCE` with `maximumAllowedCents`. After a refund, the refunded amount becomes available for a later customer payment, so a `50,000` order paid `25,000`, refunded `5,000`, can accept a further `30,000` payment. Repeating the same request with the same idempotency key returns the original payment instead of creating a duplicate. Reusing that key for another order is rejected.

Payment documents are stored separately:

```text
payments
├── _id: ObjectId
├── userId: string
├── orderId: ObjectId
├── amountCents: integer
├── paidAt: Date
├── note: string | null
├── idempotencyKey: string
└── createdAt: Date
```

The `payments` collection has a strict MongoDB validator and these indexes:

```text
{ userId: 1, orderId: 1, paidAt: -1 }
{ userId: 1, idempotencyKey: 1 } unique
```

## Frontend workflow

The web app uses the Better Auth React client with the API origin as its `baseURL`. Authentication requests and normal API requests both include credentials so the Better Auth HTTP-only session cookie is sent to Express. If `NEXT_PUBLIC_API_URL` is missing, the client falls back to `http://localhost:4000` for local development.

Frontend routes:

```text
/login                  email/password sign in
/signup                 email/password account creation
/customers              customer directory and quick order handoff
/orders                 authenticated dashboard and status filter
/orders/new             create an order with line items and optional saved customer
/orders/:orderId        order detail and payment history
/orders/:orderId/refunds refund creation and refund history
/orders/:orderId/audit  read-only status audit history
/pay/:token             customer payment page protected by access code
```

The dashboard loads the authenticated session first. If no session exists, it redirects to `/login`. Once authenticated, it loads orders from `GET /api/orders`, computes dashboard summary values from the server response, and renders status badges using the same four domain statuses as the API.

Creating an order converts the form's decimal display price to integer cents before calling the API. The user can select an existing customer, quick-create a customer with name/email, or type a one-off customer name. The API remains the source of truth and recalculates all totals. Recording a payment creates a fresh idempotency key in the browser and sends it with `POST /api/orders/:orderId/payments`.

The UI uses shadcn-style primitives and a restrained visual system: neutral surfaces, navy text, one primary blue, and semantic status colors only where status meaning is needed. No frontend Testing Library is included for this assignment; API/domain correctness is verified at the backend boundary and the frontend is verified through typecheck, production build, and route smoke tests.

## Order status

Status is derived rather than stored as the source of truth:

```text
netPaidCents = grossPaidCents - refundedTotalCents
amountDueCents = totalCents - netPaidCents
```

The priority is:

```text
net paid >= total       -> paid
past UTC due date       -> overdue
net paid > 0            -> partially_paid
otherwise               -> pending
```

An order that was overdue but is fully paid becomes `paid`. An order with a partial refund can become `partially_paid` or `overdue` again. Due dates are date-only values and are compared in UTC.

## Order coding example

Creating an order follows this path:

```text
POST /api/orders
  -> createOrderSchema.parse(request.body)
  -> createOrderUseCase(userId, input)
  -> resolve saved customer when customerId is present
  -> calculateOrderTotals(lineItems)
  -> createOrder(userId, calculated values)
  -> create stable payment link and attempt payment email for saved customers
  -> toOrderResponse(order)
```

This pattern will be reused for payments, refunds, audit logs, and CSV exports. Each module will have `routes.ts`, `controller.ts`, `service.ts`, `repository.ts`, `schema.ts`, `mapper.ts`, and `types.ts` where those responsibilities apply.

## Security notes

- Better Auth stores sessions in MongoDB and uses HTTP-only cookies.
- CORS allows only `WEB_ORIGIN` and credentials.
- Authorization headers and cookies are redacted from Pino logs.
- Request IDs are returned as `x-request-id` and included in error responses.
- Environment variables are validated at startup.
- `.env` files are ignored by git.

The Atlas credential used for local setup was provided in the development conversation. Rotate it in MongoDB Atlas if it has been exposed outside this private environment.
