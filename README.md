# Orders and Settlements

Monorepo for the CrossVal orders and settlements take-home assignment.

## Workspace

- `apps/api`: Express and TypeScript REST API.
- `apps/web`: Next.js frontend using shadcn/ui.
- `packages/shared`: Shared schemas and types.

Copy `apps/api/.env.example` to `apps/api/.env` before starting the API. The web app has its own `apps/web/.env.example` for the API URL.

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

The API runs on `http://localhost:4000` and the web app runs on the Next.js development port.

## API foundation

The API uses route, controller, service, domain, and repository layers. Orders are scoped by the authenticated user, line-item totals are calculated on the server, and order status is derived from totals and the UTC due date.

Order endpoints currently include:

```text
GET    /api/orders
POST   /api/orders
GET    /api/orders/:orderId
PATCH  /api/orders/:orderId
DELETE /api/orders/:orderId
```

Line items and prices become read-only after the first payment or refund. Orders with financial activity cannot be deleted.

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
