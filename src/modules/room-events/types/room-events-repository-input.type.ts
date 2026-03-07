import { RoomEventName } from './room-event-name.type';

export type InsertRoomEventData = {
  id: string;
  tenant: string;
  roomUuid: string;
  eventName: RoomEventName;
  payload: unknown;
  occurredAt: Date;
};

export type InsertDeferredRoomEventData = {
  id: string;
  tenant: string;
  roomUuid: string;
  eventName: RoomEventName;
  payload: unknown;
  occurredAt: Date;
  expiresAt: Date;
};
