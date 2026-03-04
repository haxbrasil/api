import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsIn, IsUUID, IsDate } from 'class-validator';
import { ROOM_EVENT_NAMES, RoomEventName } from '../types/room-event-name.type';

export class CreateRoomEventDto {
  @ApiProperty({ name: 'room_uuid', format: 'uuid' })
  @IsUUID()
  room_uuid!: string;

  @ApiProperty({ name: 'event_name', enum: ROOM_EVENT_NAMES })
  @IsIn(ROOM_EVENT_NAMES)
  event_name!: RoomEventName;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-03-04T11:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  timestamp!: Date;

  @ApiProperty({ description: 'Raw event payload from room process.' })
  @IsDefined()
  payload!: unknown;
}
