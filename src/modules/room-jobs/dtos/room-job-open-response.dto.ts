import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { RoomJobOpenHttpResult } from '../types/room-job.type';

export class RoomJobOpenResponseDto {
  @ApiProperty({ example: 'open' })
  state: 'open';

  @ApiProperty({ name: 'job_id' })
  @Expose({ name: 'job_id' })
  jobId: string;

  @ApiPropertyOptional({ name: 'room_uuid', format: 'uuid' })
  @Expose({ name: 'room_uuid' })
  roomUuid?: string;

  @ApiPropertyOptional()
  invite?: string;

  constructor(value: RoomJobOpenHttpResult) {
    this.state = 'open';
    this.jobId = value.jobId;
    this.roomUuid = value.roomUuid;
    this.invite = value.invite;
  }
}
