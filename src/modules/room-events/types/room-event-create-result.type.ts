import { DeferredRoomEvent, RoomEvent } from './room-event.type';

export type CreateRoomEventResult =
  | {
      state: 'created';
      event: RoomEvent;
    }
  | {
      state: 'deferred';
      event: DeferredRoomEvent;
    };
