import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoomJobOpenHttpResult } from '../types/room-job.type';

export class RoomJobOpenResponseDto {
  @ApiProperty({ example: 'open' })
  state: 'open';

  @ApiProperty({ name: 'job_id' })
  job_id: string;

  @ApiPropertyOptional({ name: 'room_uuid', format: 'uuid' })
  room_uuid?: string;

  @ApiPropertyOptional()
  invite?: string;

  constructor(value: RoomJobOpenHttpResult) {
    this.state = 'open';
    this.job_id = value.job_id;
    this.room_uuid = value.room_uuid;
    this.invite = value.invite;
  }
}
