import { ApiProperty } from '@nestjs/swagger';
import { RoomJobPendingHttpResult } from '../types/room-job.type';

export class RoomJobPendingResponseDto {
  @ApiProperty({ example: 'pending' })
  state: 'pending';

  @ApiProperty({ name: 'job_id' })
  job_id: string;

  constructor(value: RoomJobPendingHttpResult) {
    this.state = 'pending';
    this.job_id = value.job_id;
  }
}
