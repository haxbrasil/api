import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { RoomJobsController } from './room-jobs.controller';
import { RoomJobsService } from './room-jobs.service';
import { ROOM_JOBS_QUEUE } from './types/room-job.type';

@Module({
  imports: [
    BullModule.registerQueue({
      name: ROOM_JOBS_QUEUE,
    }),
  ],
  controllers: [RoomJobsController],
  providers: [RoomJobsService],
})
export class RoomJobsModule {}
