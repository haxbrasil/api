import { Queue, Worker } from 'bullmq';
import { err } from 'neverthrow';
import { buildRedisConnectionFromUrl } from '../../src/common/queue/redis-connection.util';
import { RoomJobsService } from '../../src/modules/room-jobs/room-jobs.service';
import {
  ROOM_JOBS_QUEUE,
  RoomJobCompletion,
  RoomJobData,
} from '../../src/modules/room-jobs/types/room-job.type';
import { get, json, post } from '../support/client';
import { roomJobQueueErrorFixture, tenantFixture } from '../fixtures';
import { expectApiError } from '../utils/error-assertions.util';
import { getE2ERuntime } from '../support/runtime';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6380/0';

describe('Room Jobs (e2e)', () => {
  const connection = buildRedisConnectionFromUrl(REDIS_URL);
  const receivedJobs: RoomJobData[] = [];

  let queue: Queue<RoomJobData, RoomJobCompletion>;
  let worker: Worker<RoomJobData, RoomJobCompletion>;

  beforeAll(async () => {
    queue = new Queue<RoomJobData, RoomJobCompletion>(ROOM_JOBS_QUEUE, {
      connection,
    });
    await queue.waitUntilReady();

    worker = new Worker<RoomJobData, RoomJobCompletion>(
      ROOM_JOBS_QUEUE,
      async (job) => {
        receivedJobs.push(job.data);

        switch (job.data.room_type) {
          case 'open-success':
            return {
              state: 'open',
              room_uuid: '00000000-0000-4000-8000-000000000010',
              invite: 'OPEN123',
            };
          case 'token-invalid':
            return {
              state: 'failed',
              code: 'token_invalid',
              message: 'Invalid headless token',
            };
          case 'token-not-provided':
            return {
              state: 'failed',
              code: 'token_not_provided',
            };
          case 'malformed':
            return {
              foo: 'bar',
            } as unknown as RoomJobCompletion;
          case 'camel-open':
            return {
              state: 'open',
              roomUuid: '00000000-0000-4000-8000-000000000123',
              invite: 'CAMEL01',
            };
          case 'throw-worker':
            throw new Error('worker exploded');
          case 'timeout':
            await new Promise((resolve) => setTimeout(resolve, 16_000));
            return {
              state: 'open',
              room_uuid: '00000000-0000-4000-8000-000000000099',
            };
          default:
            return {
              state: 'open',
            };
        }
      },
      {
        connection,
        concurrency: 4,
      },
    );

    await worker.waitUntilReady();
  });

  beforeEach(async () => {
    receivedJobs.length = 0;
    await queue.drain();
  });

  afterAll(async () => {
    await worker.close();
    await queue.close();
  });

  it('rejects requests without a bearer token', async () => {
    const response = await post('/room-jobs', {
      room_type: 'open-success',
      room_properties: {},
    });

    expect(response.status).toBe(401);

    const getResponse = await get('/room-jobs');
    expect(getResponse.status).toBe(404);
  });

  it('returns 200 when worker completes with open state', async () => {
    const tenant = tenantFixture('tenant-room-jobs-open');

    const response = await post(
      '/room-jobs',
      {
        room_type: 'open-success',
        room_properties: {
          mode: 'ranked',
        },
      },
      tenant.token,
    );

    expect(response.status).toBe(200);
    const payload = (await json(response)) as Record<string, unknown>;
    expect(payload).toMatchObject({
      state: 'open',
      room_uuid: '00000000-0000-4000-8000-000000000010',
      invite: 'OPEN123',
    });
    expect(payload).toHaveProperty('job_id', expect.any(String));
  });

  it('returns 422 when worker reports token_invalid', async () => {
    const tenant = tenantFixture('tenant-room-jobs-token-invalid');

    const response = await post(
      '/room-jobs',
      {
        room_type: 'token-invalid',
        room_properties: {},
        token: 'bad-token',
      },
      tenant.token,
    );

    expect(response.status).toBe(422);
    const payload = (await json(response)) as Record<string, unknown>;
    expect(payload).toMatchObject({
      state: 'failed',
      code: 'token_invalid',
    });
    expect(payload).toHaveProperty('job_id', expect.any(String));
  });

  it('returns 422 when worker reports token_not_provided', async () => {
    const tenant = tenantFixture('tenant-room-jobs-token-missing');

    const response = await post(
      '/room-jobs',
      {
        room_type: 'token-not-provided',
        room_properties: {},
      },
      tenant.token,
    );

    expect(response.status).toBe(422);
    expect(await json(response)).toEqual(
      expect.objectContaining({
        state: 'failed',
        code: 'token_not_provided',
      }),
    );
  });

  it('returns 422 with deterministic code for invalid completion payload', async () => {
    const tenant = tenantFixture('tenant-room-jobs-malformed');

    const response = await post(
      '/room-jobs',
      {
        room_type: 'malformed',
        room_properties: {},
      },
      tenant.token,
    );

    expect(response.status).toBe(422);
    expect(await json(response)).toEqual(
      expect.objectContaining({
        state: 'failed',
        code: 'invalid_completion_payload',
      }),
    );
  });

  it('returns 202 when completion does not arrive within 15 seconds', async () => {
    const tenant = tenantFixture('tenant-room-jobs-timeout');

    const response = await post(
      '/room-jobs',
      {
        room_type: 'timeout',
        room_properties: {},
      },
      tenant.token,
    );

    expect(response.status).toBe(202);
    const payload = (await json(response)) as Record<string, unknown>;
    expect(payload).toMatchObject({
      state: 'pending',
    });
    expect(payload).toHaveProperty('job_id', expect.any(String));
  }, 25_000);

  it('forwards tenant and optional token to BullMQ job payload', async () => {
    const tenant = tenantFixture('tenant-room-jobs-forwarding');

    const response = await post(
      '/room-jobs',
      {
        room_type: 'open-success',
        room_properties: {
          room_name: 'Hax Brasil Test Room',
        },
        token: 'headless-token-123',
      },
      tenant.token,
    );

    expect(response.status).toBe(200);
    expect(receivedJobs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tenant: tenant.tenant,
          room_type: 'open-success',
          token: 'headless-token-123',
          room_properties: {
            room_name: 'Hax Brasil Test Room',
          },
        }),
      ]),
    );
  }, 15_000);

  it('validates room job payload fields', async () => {
    const tenant = tenantFixture('tenant-room-jobs-validation');

    const missingPropertiesResponse = await post(
      '/room-jobs',
      {
        room_type: 'open-success',
      },
      tenant.token,
    );
    expect(missingPropertiesResponse.status).toBe(400);

    const emptyTypeResponse = await post(
      '/room-jobs',
      {
        room_type: '',
        room_properties: {},
      },
      tenant.token,
    );
    expect(emptyTypeResponse.status).toBe(400);

    const tooLongTokenResponse = await post(
      '/room-jobs',
      {
        room_type: 'open-success',
        room_properties: {},
        token: 'x'.repeat(1025),
      },
      tenant.token,
    );
    expect(tooLongTokenResponse.status).toBe(400);
  });

  it('returns 422 when worker throws non-timeout error', async () => {
    const tenant = tenantFixture('tenant-room-jobs-worker-throw');

    const response = await post(
      '/room-jobs',
      {
        room_type: 'throw-worker',
        room_properties: {},
      },
      tenant.token,
    );

    expect(response.status).toBe(422);
    expect(await json(response)).toEqual(
      expect.objectContaining({
        state: 'failed',
        code: 'worker_failed',
      }),
    );
  });

  it('normalizes camelCase roomUuid from worker completion', async () => {
    const tenant = tenantFixture('tenant-room-jobs-camel');

    const response = await post(
      '/room-jobs',
      {
        room_type: 'camel-open',
        room_properties: {},
      },
      tenant.token,
    );

    expect(response.status).toBe(200);
    expect(await json(response)).toEqual(
      expect.objectContaining({
        state: 'open',
        room_uuid: '00000000-0000-4000-8000-000000000123',
        invite: 'CAMEL01',
      }),
    );
  });

  it('forwards tenant and omits token field when token is not provided', async () => {
    const tenant = tenantFixture('tenant-room-jobs-forwarding-no-token');

    const response = await post(
      '/room-jobs',
      {
        room_type: 'open-success',
        room_properties: {
          room_name: 'No Token Room',
        },
      },
      tenant.token,
    );

    expect(response.status).toBe(200);
    expect(receivedJobs).toHaveLength(1);
    expect(receivedJobs[0]).toEqual(
      expect.objectContaining({
        tenant: tenant.tenant,
        room_type: 'open-success',
        room_properties: {
          room_name: 'No Token Room',
        },
      }),
    );
    expect('token' in receivedJobs[0]).toBe(false);
  });

  it('maps queue failures to 500 persistence_error', async () => {
    const tenant = tenantFixture('tenant-room-jobs-persistence');
    const service = getE2ERuntime().app.get(RoomJobsService);
    jest
      .spyOn(service, 'create')
      .mockResolvedValueOnce(err(roomJobQueueErrorFixture()));

    const response = await post(
      '/room-jobs',
      {
        room_type: 'open-success',
        room_properties: {},
      },
      tenant.token,
    );

    await expectApiError(
      response,
      500,
      'persistence_error',
      'Unexpected error',
    );
  });
});
