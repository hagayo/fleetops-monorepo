# FleetOps Monorepo

PNPM workspace with:
- apps/api-gateway (port 4330)
- apps/frontend-next (Next.js 14, port 4320, M3-themed UI)
- packages/event-bus
- services/robot-registry
- services/mission-orchestrator
- packages/types

## Dev

```bash
pnpm install
pnpm run api:dev     # http://127.0.0.1:4330
pnpm run web:dev     # http://127.0.0.1:4320
```

## Scripts
- pnpm -r build - build all packages/services
- pnpm -r test - run node:test suites
- pnpm -r lint - run ESLint across workspace


## How to use:
- Install and build: `pnpm install` then `pnpm build`.
- Optional: generate DTOs from OpenAPI with `openapi-typescript openapi.yaml -o packages/types/src/generated.ts`.

- run in terminal 1: pnpm run api:dev
# server listens on http://127.0.0.1:4330

- run in terminal 2: pnpm run web:dev
# dashboard runs on http://127.0.0.1:4320


## Links:
http://127.0.0.1:4330/healthz
http://localhost:4330/robots
http://localhost:4330/missions
http://localhost:4330/stats

http://127.0.0.1:4320 OR http://localhost:4320/api/missions 

http://localhost:3001/