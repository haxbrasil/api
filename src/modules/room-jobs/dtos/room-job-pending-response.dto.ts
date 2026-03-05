import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { RoomJobPendingHttpResult } from '../types/room-job.type';

export class RoomJobPendingResponseDto {
  @ApiProperty({ example: 'pending' })
  state: 'pending';

  @ApiProperty({ name: 'job_id' })
  @Expose({ name: 'job_id' })
  jobId: string;

  constructor(value: RoomJobPendingHttpResult) {
    this.state = 'pending';
    this.jobId = value.jobId;
  }
}
