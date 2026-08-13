# Orders and Settlements

Monorepo for the CrossVal orders and settlements take-home assignment.

## Workspace

- `apps/api`: Express and TypeScript REST API.
- `apps/web`: Next.js frontend using shadcn/ui.
- `packages/shared`: Shared schemas and types.

Copy `apps/api/.env.example` to `apps/api/.env` before starting the API. The web app has its own `apps/web/.env.example` for the API URL.

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
