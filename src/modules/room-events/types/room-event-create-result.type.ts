import { DeferredRoomEventRow, RoomEventRow } from '../../database/database';
import { RoomEventName } from './room-event-name.type';

export type CreateRoomEventResult =
  | {
      state: 'created';
      event: RoomEventRow<RoomEventName>;
    }
  | {
      state: 'deferred';
      event: DeferredRoomEventRow<RoomEventName>;
    };
