# Recordings Module

## Purpose

- Ingest replay files and expose short-code based retrieval/listing.
- Validate replay payloads before persistence.
- Coordinate metadata storage in MySQL and binary storage in object storage.

## Architecture

- `RecordingsController` handles upload and read endpoints.
- `RecordingsService` validates replay bytes and orchestrates DB plus object storage.
- `RecordingsRepository` owns SQL and converts duplicate code collisions to typed errors.
- `FilePersistenceService` writes replay objects and builds public URLs.
- Pagination behavior is shared through common API pagination utilities.

## Request/Flow Model

Create flow validates the replay with `@hax-brasil/replay-decoder`, generates a short code, inserts metadata, then uploads the file object. If object upload fails after metadata insert, the service deletes the inserted row to avoid dangling records. Listing and retrieval are tenant-scoped and use the persisted short code as the external lookup key.

## Key Files

- `recordings.controller.ts`
- `recordings.service.ts`
- `recordings.repository.ts`
- `types/recording-error.type.ts`
- `utils/recording-*.util.ts`

## Notes

- Code generation retries are capped (`MAX_RECORDING_CODE_ATTEMPTS = 20`).
- Code collisions are expected and retried without surfacing as generic failures.
