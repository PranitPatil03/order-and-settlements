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

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm typecheck
pnpm format:check
```

The API runs on `http://localhost:4000` and the web app runs on the Next.js development port. Restart the dev server after changing `NEXT_PUBLIC_API_URL`, because Next.js bundles public environment variables at startup.

## API foundation

The API uses route, controller, service, domain, and repository layers. Orders are scoped by the authenticated user, line-item totals are calculated on the server, and order status is derived from totals and the UTC due date.

Order endpoints currently include:

```text
GET    /api/orders
POST   /api/orders
GET    /api/orders/:orderId
PATCH  /api/orders/:orderId
DELETE /api/orders/:orderId
POST   /api/orders/:orderId/payment-link
DELETE /api/orders/:orderId/payment-link
```

Line items and prices become read-only after the first payment or refund. Orders with financial activity cannot be deleted.

### Payment meaning

Payments are internal settlement records. The authenticated user is the account owner or finance operator who owns the order and records money received; that user is not treated as the payer. `customer` is currently a customer name stored on the order, not a customer login or payment identity. Recording a payment does not charge a card, send a payment link, or ask the customer to pay.

If customer self-service payments are added later, they should be a separate flow: invite or identify the customer in a portal, create a payment-provider intent, accept only provider webhooks as payment confirmation, and store the provider transaction ID for idempotency. Manual finance entries should remain available as a separate, clearly labelled operation.

### Customer payment links

An authenticated order owner can call `POST /api/orders/:orderId/payment-link`. The API generates a cryptographically random opaque token and a separate 10-character access code, stores only their SHA-256 hashes, and returns a URL such as `http://localhost:3000/pay/<token>` plus the code. The customer needs both values. Generating a new link invalidates the previous link; `DELETE` revokes the current link.

The public page calls:

```text
GET  /api/public/payment-links/:token              X-Payment-Code: <code>
POST /api/public/payment-links/:token/payments    X-Payment-Code + Idempotency-Key
```

The public response exposes the customer name, line items, currency, due date, totals, current balance, and payment history only after the access code is verified. The customer can submit a partial or full amount with an optional note. The page polls for new payment history every 10 seconds. The API applies the same balance and idempotency rules as internal payments and records the payment against the order owner's account. This is a demo/manual payment confirmation flow for the assignment; it does not process cards or move money. In production, replace this endpoint with a payment-provider checkout and verified webhook while retaining the opaque link and ownership boundaries.

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

## MongoDB schema

MongoDB is flexible by default, so this project uses two layers of schema protection:

1. Zod validates API input before it reaches the service.
2. MongoDB creates the `orders` collection with a strict `$jsonSchema` validator in `apps/api/src/config/mongo-schema.ts`.

The collection is created on API startup before indexes are created. The current order document is:

```text
orders
├── _id: ObjectId
├── userId: string
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
```

The `userId` condition is included in every order repository query, which prevents one authenticated user from reading or modifying another user's data.

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
  -> atomically increment order.grossPaidCents if it stays <= totalCents
  -> insert immutable payment document
  -> commit transaction
```

If the balance condition fails, the transaction is aborted and the API returns `409 PAYMENT_EXCEEDS_BALANCE` with `maximumAllowedCents`. Repeating the same request with the same idempotency key returns the original payment instead of creating a duplicate. Reusing that key for another order is rejected.

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
/orders                 authenticated dashboard and status filter
/orders/new             create an order with line items
/orders/:orderId        order detail, payment form, and payment history
```

The dashboard loads the authenticated session first. If no session exists, it redirects to `/login`. Once authenticated, it loads orders from `GET /api/orders`, computes dashboard summary values from the server response, and renders status badges using the same four domain statuses as the API.

Creating an order converts the form's decimal display price to integer cents before calling the API. The API remains the source of truth and recalculates all totals. Recording a payment creates a fresh idempotency key in the browser and sends it with `POST /api/orders/:orderId/payments`.

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
  -> calculateOrderTotals(lineItems)
  -> createOrder(userId, calculated values)
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
