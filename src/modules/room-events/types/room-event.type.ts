import { RoomEventName } from './room-event-name.type';

export type RoomEvent = {
  id: string;
  roomUuid: string;
  eventName: RoomEventName;
  payload: unknown;
  occurredAt: Date;
  createdAt: Date;
};

export type DeferredRoomEvent = {
  id: string;
  tenant: string;
  roomUuid: string;
  eventName: RoomEventName;
  payload: unknown;
  occurredAt: Date;
  expiresAt: Date;
  createdAt: Date;
};
