import * as crypto from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';
import { Page } from '../../common/api/pagination/types/page.type';
import { paginate } from '../../common/api/pagination/utils/page.util';
import { RoomEventRow } from '../database/database';
import { PersistenceError } from '../database/database.error';
import { RoomsRepository } from '../rooms/rooms.repository';
import { RoomNotFoundError } from '../rooms/rooms.error';
import { CreateRoomEventDto } from './dtos/create-room-event.dto';
import { RoomEventsRepository } from './room-events.repository';
import { CreateRoomEventResult } from './types/room-event-create-result.type';
import { RoomInactiveError } from './types/room-event-error.type';
import { RoomEventName } from './types/room-event-name.type';

const DEFERRED_ROOM_EVENT_TTL_MS = 5 * 60 * 1000;
const DEFERRED_RECONCILE_BATCH_SIZE = 100;

@Injectable()
export class RoomEventsService {
  constructor(
    private readonly roomEventsRepo: RoomEventsRepository,
    private readonly roomsRepo: RoomsRepository,
  ) {}

  async createEvent(
    tenant: string,
    input: CreateRoomEventDto,
  ): Promise<
    Result<CreateRoomEventResult, RoomInactiveError | PersistenceError>
  > {
    const roomResult = await this.roomsRepo.findById(tenant, input.room_uuid);

    if (roomResult.isErr()) {
      return err(roomResult.error);
    }

    if (!roomResult.value) {
      const deferredResult = await this.roomEventsRepo.insertDeferredEvent({
        id: crypto.randomUUID(),
        tenant,
        roomUuid: input.room_uuid,
        eventName: input.event_name,
        payload: input.payload,
        occurredAt: input.timestamp,
        expiresAt: new Date(Date.now() + DEFERRED_ROOM_EVENT_TTL_MS),
      });

      if (deferredResult.isErr()) {
        return err(deferredResult.error);
      }

      return ok({
        state: 'deferred',
        event: deferredResult.value,
      });
    }

    if (!roomResult.value.active) {
      return err({
        type: 'room_inactive',
        roomId: input.room_uuid,
      });
    }

    const createResult = await this.roomEventsRepo.insertEvent({
      id: crypto.randomUUID(),
      tenant,
      roomUuid: input.room_uuid,
      eventName: input.event_name,
      payload: input.payload,
      occurredAt: input.timestamp,
    });

    if (createResult.isErr()) {
      return err(createResult.error);
    }

    if (!createResult.value) {
      return err({
        type: 'room_inactive',
        roomId: input.room_uuid,
      });
    }

    return ok({
      state: 'created',
      event: createResult.value,
    });
  }

  async listByRoom(
    tenant: string,
    roomId: string,
    page: number,
    pageSize: number,
  ): Promise<
    Result<
      Page<RoomEventRow<RoomEventName>>,
      RoomNotFoundError | PersistenceError
    >
  > {
    const roomResult = await this.roomsRepo.findById(tenant, roomId);

    if (roomResult.isErr()) {
      return err(roomResult.error);
    }

    if (!roomResult.value) {
      return err({
        type: 'room_not_found',
        roomId,
      });
    }

    return await this.roomEventsRepo
      .listEvents(roomId, page, pageSize)
      .then((result) => result.map((rows) => paginate(rows, page, pageSize)));
  }

  async reconcileDeferredEvents(
    now = new Date(),
  ): Promise<Result<void, PersistenceError>> {
    const deleteExpiredResult =
      await this.roomEventsRepo.deleteExpiredDeferredEvents(now);

    if (deleteExpiredResult.isErr()) {
      return err(deleteExpiredResult.error);
    }

    const deferredResult = await this.roomEventsRepo.listPendingDeferredEvents(
      now,
      DEFERRED_RECONCILE_BATCH_SIZE,
    );

    if (deferredResult.isErr()) {
      return err(deferredResult.error);
    }

    for (const deferredEvent of deferredResult.value) {
      const roomResult = await this.roomsRepo.findById(
        deferredEvent.tenant,
        deferredEvent.roomUuid,
      );

      if (roomResult.isErr()) {
        return err(roomResult.error);
      }

      if (!roomResult.value || !roomResult.value.active) {
        continue;
      }

      const createEventResult = await this.roomEventsRepo.insertEvent({
        id: crypto.randomUUID(),
        tenant: deferredEvent.tenant,
        roomUuid: deferredEvent.roomUuid,
        eventName: deferredEvent.eventName,
        payload: deferredEvent.payload,
        occurredAt: deferredEvent.occurredAt,
      });

      if (createEventResult.isErr()) {
        return err(createEventResult.error);
      }

      if (!createEventResult.value) {
        continue;
      }

      const deleteDeferredResult = await this.roomEventsRepo.deleteDeferredById(
        deferredEvent.id,
      );

      if (deleteDeferredResult.isErr()) {
        return err(deleteDeferredResult.error);
      }
    }

    return ok();
  }
}
