import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { RoomEventRow } from '../../database/database';
import { ROOM_EVENT_NAMES } from '../types/room-event-name.type';
import { RoomEventName } from '../types/room-event-name.type';

export class RoomEventResponseDto {
  @ApiProperty({ name: 'uuid' })
  @Expose({ name: 'uuid' })
  uuid: string;

  @ApiProperty({ name: 'room_uuid', format: 'uuid' })
  @Expose({ name: 'room_uuid' })
  roomUuid: string;

  @ApiProperty({ name: 'event_name', enum: ROOM_EVENT_NAMES })
  @Expose({ name: 'event_name' })
  eventName: string;

  @ApiProperty()
  payload: unknown;

  @ApiProperty({ type: String, format: 'date-time' })
  timestamp: Date;

  @ApiProperty({ name: 'created_at', type: String, format: 'date-time' })
  @Expose({ name: 'created_at' })
  createdAt: Date;

  constructor(event: RoomEventRow<RoomEventName>) {
    this.uuid = event.id;
    this.roomUuid = event.roomUuid;
    this.eventName = event.eventName;
    this.payload = event.payload;
    this.timestamp = event.occurredAt;
    this.createdAt = event.createdAt;
  }
}
