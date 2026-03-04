import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue, QueueEvents } from 'bullmq';
import { err, ok, Result } from 'neverthrow';
import {
  errorMessageContains,
  getErrorMessage,
} from '../../common/data/error.util';
import { buildRedisConnectionFromUrl } from '../../common/queue/redis-connection.util';
import { EnvSchema } from '../../env/env.schema';
import { CreateRoomJobDto } from './dtos/create-room-job.dto';
import {
  ROOM_JOB_NAME,
  ROOM_JOBS_QUEUE,
  RoomJobCompletion,
  RoomJobData,
  RoomJobFailedHttpResult,
  RoomJobHttpResult,
  RoomJobPendingHttpResult,
  RoomJobQueueError,
} from './types/room-job.type';
import { toRoomJobHttpResult } from './utils/room-job-completion.util';

const ROOM_JOB_WAIT_TIMEOUT_MS = 15_000;

@Injectable()
export class RoomJobsService implements OnModuleDestroy {
  private readonly redisUrl: string;
  private queueEvents: QueueEvents | null = null;

  constructor(
    @InjectQueue(ROOM_JOBS_QUEUE)
    private readonly roomJobsQueue: Queue<RoomJobData, RoomJobCompletion>,
    config: ConfigService<EnvSchema, true>,
  ) {
    this.redisUrl = config.getOrThrow('REDIS_URL', { infer: true });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queueEvents) {
      await this.queueEvents.close();
      this.queueEvents = null;
    }
  }

  async create(
    tenant: string,
    input: CreateRoomJobDto,
  ): Promise<Result<RoomJobHttpResult, RoomJobQueueError>> {
    const payload: RoomJobData = {
      tenant,
      room_type: input.room_type,
      room_properties: input.room_properties,
      ...(input.token ? { token: input.token } : {}),
    };

    let job: Job<RoomJobData, RoomJobCompletion>;

    try {
      job = await this.roomJobsQueue.add(ROOM_JOB_NAME, payload);
    } catch (error: unknown) {
      return err({
        type: 'room_job_queue_error',
        cause: error,
      });
    }

    const jobId = String(job.id);

    try {
      const queueEvents = this.getQueueEvents();
      await queueEvents.waitUntilReady();

      const completion = await job.waitUntilFinished(
        queueEvents,
        ROOM_JOB_WAIT_TIMEOUT_MS,
      );

      return ok(toRoomJobHttpResult(jobId, completion));
    } catch (error: unknown) {
      return ok(this.mapWaitError(jobId, error));
    }
  }

  private getQueueEvents(): QueueEvents {
    if (!this.queueEvents) {
      this.queueEvents = new QueueEvents(ROOM_JOBS_QUEUE, {
        connection: buildRedisConnectionFromUrl(this.redisUrl),
      });
    }

    return this.queueEvents;
  }

  private mapWaitError(
    jobId: string,
    error: unknown,
  ): RoomJobPendingHttpResult | RoomJobFailedHttpResult {
    if (errorMessageContains(error, 'timed out')) {
      return {
        state: 'pending',
        job_id: jobId,
      };
    }

    return {
      state: 'failed',
      job_id: jobId,
      code: 'worker_failed',
      message: getErrorMessage(error, 'Unexpected worker failure'),
    };
  }
}
