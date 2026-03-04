# Room Jobs Module

## Purpose

- Bridge HTTP requests to an external room worker process through BullMQ.
- Enqueue room-open jobs with tenant context and optional token passthrough.
- Return stateful HTTP responses based on completion payload or timeout.

## Architecture

- `RoomJobsController` maps job result states to HTTP status (`200`, `422`, `202`).
- `RoomJobsService` enqueues jobs, waits for completion events, and maps failures.
- Queue registration is done in `RoomJobsModule` via `@nestjs/bullmq`.
- Redis connection config is shared from environment-driven queue utilities.
- Completion payload parsing is isolated in `utils/room-job-completion.util.ts`.

## Request/Flow Model

```mermaid
sequenceDiagram
  participant Client
  participant API as RoomJobsController/Service
  participant Queue as BullMQ Queue
  participant Worker as Room Worker
  Client->>API: POST /room-jobs (tenant, room_type, room_properties, token?)
  API->>Queue: add open-room job
  Queue-->>Worker: deliver job
  Worker-->>Queue: completion payload
  API->>Queue: waitUntilFinished (<=15s)
  alt state = open
    Queue-->>API: {state: \"open\", ...}
    API-->>Client: 200 open
  else state = failed
    Queue-->>API: {state: \"failed\", code, ...}
    API-->>Client: 422 failed
  else timeout
    API-->>Client: 202 pending(job_id)
  end
```

## Key Files

- `room-jobs.controller.ts`
- `room-jobs.service.ts`
- `room-jobs.module.ts`
- `types/room-job.type.ts`
- `utils/room-job-completion.util.ts`

## Notes

- Tenant is always propagated into job payload from authenticated service token.
- Timeout does not fail the job; it returns a pending state for asynchronous completion.
