import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { RoomJobFailedHttpResult } from '../types/room-job.type';

export class RoomJobFailedResponseDto {
  @ApiProperty({ example: 'failed' })
  state: 'failed';

  @ApiProperty({ name: 'job_id' })
  @Expose({ name: 'job_id' })
  jobId: string;

  @ApiProperty({
    example: 'token_invalid',
    description:
      'Failure code from worker completion payload or internal compatibility mapping.',
  })
  code: string;

  @ApiPropertyOptional()
  message?: string;

  constructor(value: RoomJobFailedHttpResult) {
    this.state = 'failed';
    this.jobId = value.jobId;
    this.code = value.code;
    this.message = value.message;
  }
}
