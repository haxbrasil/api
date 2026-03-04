import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';
import sql from 'sql-template-tag';
import { getPageWindow } from '../../common/pagination/utils/page.util';
import { parseJsonValue } from '../../common/utils/json-value.util';
import { toJsonSqlColumn } from '../../common/utils/json-sql-column.util';
import { mapRecordFields } from '../../common/utils/record-field-mapper.util';
import { PersistenceError } from '../database/database.error';
import { DatabaseService } from '../database/database.service';
import {
  InsertDeferredRoomEventData,
  InsertRoomEventData,
} from './types/room-events-repository-input.type';
import { DeferredRoomEvent, RoomEvent } from './types/room-event.type';
import { RoomEventName } from './types/room-event-name.type';

type RoomEventRow = {
  id: string;
  roomUuid: string;
  eventName: RoomEventName;
  payload: unknown;
  occurredAt: Date;
  createdAt: Date;
};

type DeferredRoomEventRow = {
  id: string;
  tenant: string;
  roomUuid: string;
  eventName: RoomEventName;
  payload: unknown;
  occurredAt: Date;
  expiresAt: Date;
  createdAt: Date;
};

@Injectable()
export class RoomEventsRepository {
  constructor(private readonly db: DatabaseService) {}

  async insertEvent(
    data: InsertRoomEventData,
  ): Promise<Result<RoomEvent, PersistenceError>> {
    const insertResult = await this.db.query(sql`
      INSERT INTO room_events (id, room_uuid, event_name, payload, occurred_at)
      VALUES (
        ${data.id},
        ${data.roomUuid},
        ${data.eventName},
        ${toJsonSqlColumn(data.payload)},
        ${data.occurredAt}
      )
    `);

    if (insertResult.isErr()) {
      return err(insertResult.error);
    }

    const eventResult = await this.findEventById(data.id);

    if (eventResult.isErr()) {
      return err(eventResult.error);
    }

    if (!eventResult.value) {
      return err({
        type: 'persistence_error',
        code: undefined,
        cause: new Error(
          'Invariant violated: expected room event after insert',
        ),
      });
    }

    return ok(eventResult.value);
  }

  async findEventById(
    eventId: string,
  ): Promise<Result<RoomEvent | null, PersistenceError>> {
    const rowResult = await this.db.queryOne<RoomEventRow>`
      SELECT * FROM room_events
      WHERE id = ${eventId}
    `;

    if (rowResult.isErr()) {
      return err(rowResult.error);
    }

    if (!rowResult.value) {
      return ok(null);
    }

    return ok(
      mapRecordFields(rowResult.value, {
        payload: parseJsonValue,
      }),
    );
  }

  async listEvents(
    roomUuid: string,
    page: number,
    pageSize: number,
  ): Promise<Result<RoomEvent[], PersistenceError>> {
    const { limitPlusOne, offset } = getPageWindow(page, pageSize);

    const rowsResult = await this.db.query<RoomEventRow>`
      SELECT * FROM room_events
      WHERE room_uuid = ${roomUuid}
      ORDER BY occurred_at DESC, id DESC
      LIMIT ${limitPlusOne}
      OFFSET ${offset}
    `;

    if (rowsResult.isErr()) {
      return err(rowsResult.error);
    }

    return ok(
      rowsResult.value.map((row) =>
        mapRecordFields(row, {
          payload: parseJsonValue,
        }),
      ),
    );
  }

  async insertDeferredEvent(
    data: InsertDeferredRoomEventData,
  ): Promise<Result<DeferredRoomEvent, PersistenceError>> {
    const insertResult = await this.db.query(sql`
      INSERT INTO deferred_room_events (
        id,
        tenant,
        room_uuid,
        event_name,
        payload,
        occurred_at,
        expires_at
      )
      VALUES (
        ${data.id},
        ${data.tenant},
        ${data.roomUuid},
        ${data.eventName},
        ${toJsonSqlColumn(data.payload)},
        ${data.occurredAt},
        ${data.expiresAt}
      )
    `);

    if (insertResult.isErr()) {
      return err(insertResult.error);
    }

    const deferredResult = await this.findDeferredById(data.id);

    if (deferredResult.isErr()) {
      return err(deferredResult.error);
    }

    if (!deferredResult.value) {
      return err({
        type: 'persistence_error',
        code: undefined,
        cause: new Error(
          'Invariant violated: expected deferred room event after insert',
        ),
      });
    }

    return ok(deferredResult.value);
  }

  async findDeferredById(
    deferredId: string,
  ): Promise<Result<DeferredRoomEvent | null, PersistenceError>> {
    const rowResult = await this.db.queryOne<DeferredRoomEventRow>`
      SELECT * FROM deferred_room_events
      WHERE id = ${deferredId}
    `;

    if (rowResult.isErr()) {
      return err(rowResult.error);
    }

    if (!rowResult.value) {
      return ok(null);
    }

    return ok(
      mapRecordFields(rowResult.value, {
        payload: parseJsonValue,
      }),
    );
  }

  async listPendingDeferredEvents(
    now: Date,
    limit: number,
  ): Promise<Result<DeferredRoomEvent[], PersistenceError>> {
    const rowsResult = await this.db.query<DeferredRoomEventRow>`
      SELECT * FROM deferred_room_events
      WHERE expires_at > ${now}
      ORDER BY created_at ASC, id ASC
      LIMIT ${limit}
    `;

    if (rowsResult.isErr()) {
      return err(rowsResult.error);
    }

    return ok(
      rowsResult.value.map((row) =>
        mapRecordFields(row, {
          payload: parseJsonValue,
        }),
      ),
    );
  }

  async deleteExpiredDeferredEvents(
    now: Date,
  ): Promise<Result<void, PersistenceError>> {
    const deleteResult = await this.db.query`
      DELETE FROM deferred_room_events
      WHERE expires_at <= ${now}
    `;

    if (deleteResult.isErr()) {
      return err(deleteResult.error);
    }

    return ok();
  }

  async deleteDeferredById(
    deferredId: string,
  ): Promise<Result<void, PersistenceError>> {
    const deleteResult = await this.db.query`
      DELETE FROM deferred_room_events
      WHERE id = ${deferredId}
    `;

    if (deleteResult.isErr()) {
      return err(deleteResult.error);
    }

    return ok();
  }
}
