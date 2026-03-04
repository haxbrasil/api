import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { DeferredRoomEventRow } from '../../database/database';
import { ROOM_EVENT_NAMES } from '../types/room-event-name.type';
import { RoomEventName } from '../types/room-event-name.type';

export class DeferredRoomEventResponseDto {
  @ApiProperty({ example: 'deferred' })
  state: 'deferred';

  @ApiProperty({ name: 'room_uuid', format: 'uuid' })
  @Expose({ name: 'room_uuid' })
  roomUuid: string;

  @ApiProperty({ name: 'event_name', enum: ROOM_EVENT_NAMES })
  @Expose({ name: 'event_name' })
  eventName: string;

  @ApiProperty({ type: String, format: 'date-time' })
  timestamp: Date;

  @ApiProperty({ name: 'expires_at', type: String, format: 'date-time' })
  @Expose({ name: 'expires_at' })
  expiresAt: Date;

  constructor(event: DeferredRoomEventRow<RoomEventName>) {
    this.state = 'deferred';
    this.roomUuid = event.roomUuid;
    this.eventName = event.eventName;
    this.timestamp = event.occurredAt;
    this.expiresAt = event.expiresAt;
  }
}
