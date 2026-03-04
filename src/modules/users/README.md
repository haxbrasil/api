# Users Module

## Purpose

- Manage tenant-scoped service users backed by MySQL.
- Provide identity create/list/get/update operations and credential confirmation.
- Keep transport behavior stable through typed domain errors.

## Architecture

- `UsersController` maps domain/persistence errors to HTTP responses and shared API error payloads.
- `UsersService` orchestrates use cases with `neverthrow` results.
- `UsersRepository` owns SQL, tenant filters, and pagination queries.
- Duplicate key collisions are translated from MySQL errors to `user_already_exists`.
- `DatabaseService` provides camelCase rows for repository consumers.

## Request/Flow Model

Every request is tenant-scoped through the authenticated service token (`@Tenant()`). Create and update flows write first, then read back the current persisted user for response consistency. Confirm flow checks stored password equality and returns a typed confirmation payload; missing users are represented as `is_correct = false` instead of a not-found error.

## Key Files

- `users.controller.ts`
- `users.service.ts`
- `users.repository.ts`
- `users.error.ts`
- `dtos/*`

## Notes

- User identity and username uniqueness are enforced per tenant.
- List queries use deterministic ordering (`created_at DESC, id DESC`).
