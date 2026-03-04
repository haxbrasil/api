# API

Open-source, multi-tenant NestJS API for HaxBall rooms and communities.

This project is a generic backend that can be reused by different rooms and communities with service tokens.

## Requirements

- Node.js 22
- pnpm 10
- MySQL

## Setup

```bash
pnpm install
cp .env .env.local # optional
```

Set env vars (at least):

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `JWT_PUBLIC_KEY`
- `JWT_PRIVATE_KEY`
- `JWT_ALGO`
- `JWT_ISS`
- `JWT_AUD`
- `JWT_EXP`
- `FILE_STORAGE_ENDPOINT`
- `FILE_STORAGE_REGION`
- `FILE_STORAGE_ACCESS_KEY_ID`
- `FILE_STORAGE_SECRET_ACCESS_KEY`
- `FILE_STORAGE_RECS_BUCKET`
- `FILE_STORAGE_RECS_PUBLIC_BASE_URL`
- `FILE_STORAGE_FORCE_PATH_STYLE` (optional; useful for MinIO/local S3)
- `REDIS_URL`

## Run

```bash
# development
pnpm run start:dev

# production (after build)
pnpm run build
pnpm run start:prod
```

## Database

```bash
pnpm run db:up
pnpm run db:down
pnpm run db:status
```

## Tests and Checks

```bash
pnpm run lint
pnpm run build
pnpm run test:e2e:docker
pnpm run swagger:check
```

## Docs

- Swagger UI: `/api`
- Swagger file: `docs/api/swagger.yaml`
- Deployment notes: `docs/deploy/README.md`
