# Rooms Module

## Purpose

- Manage tenant-scoped room metadata records.
- Provide room lifecycle operations (create, list, get, update, deactivate).
- Represent room shutdown as a soft state transition, not physical deletion.

## Architecture

- `RoomsController` exposes room HTTP endpoints and maps domain errors.
- `RoomsService` enforces lifecycle rules such as "update only when active."
- `RoomsRepository` owns SQL, tenant filters, and room row mapping.
- Repository mapping normalizes JSON and boolean DB fields into domain shapes.
- Pagination and filtering are handled in repository queries plus shared paging utils.

## Request/Flow Model

`POST /rooms` creates a new active room with server-generated UUID. `PUT /rooms/:uuid` first verifies tenant ownership and active state, then applies partial updates. `DELETE /rooms/:uuid` performs soft deactivation by setting `active = false` and `inactivated_at`. `GET` endpoints support tenant-scoped listing and direct lookup by UUID.

## Key Files

- `rooms.controller.ts`
- `rooms.service.ts`
- `rooms.repository.ts`
- `rooms.error.ts`
- `dtos/*`

## Notes

- Detail DTO includes sensitive fields (`password`, `token`), list DTO omits them.
- Deactivation is idempotent at persistence level for already inactive rooms.
