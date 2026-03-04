import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';
import sql, { join, Sql } from 'sql-template-tag';
import { getPageWindow } from '../../common/api/pagination/utils/page.util';
import { toBoolean, toNullableBoolean } from '../../common/data/boolean.util';
import { toNullableJsonSqlColumn } from '../../common/persistence/json-sql-column.util';
import { mapRecordFields } from '../../common/data/record-field-mapper.util';
import { RoomRow } from '../database/database';
import { PersistenceError } from '../database/database.error';
import { DatabaseService } from '../database/database.service';
import { parseRoomGeo } from './utils/room-mapping.util';
import { Room, RoomInputData, RoomUpdateData } from './types/room.type';

@Injectable()
export class RoomsRepository {
  constructor(private readonly db: DatabaseService) {}

  async insert(input: RoomInputData): Promise<Result<Room, PersistenceError>> {
    const geoValue = toNullableJsonSqlColumn(input.geo);

    const insertResult = await this.db.query(sql`
      INSERT INTO rooms (
        id,
        tenant,
        invite,
        name,
        player_name,
        password,
        \`public\`,
        max_players,
        geo,
        token,
        no_player
      )
      VALUES (
        ${input.id},
        ${input.tenant},
        ${input.invite},
        ${input.name},
        ${input.playerName ?? null},
        ${input.password ?? null},
        ${input.public ?? null},
        ${input.maxPlayers ?? null},
        ${geoValue},
        ${input.token ?? null},
        ${input.noPlayer ?? null}
      )
    `);

    if (insertResult.isErr()) {
      return err(insertResult.error);
    }

    const roomResult = await this.findById(input.tenant, input.id);

    if (roomResult.isErr()) {
      return err(roomResult.error);
    }

    if (!roomResult.value) {
      return err({
        type: 'persistence_error',
        code: undefined,
        cause: new Error('Invariant violated: expected room after insert'),
      });
    }

    return ok(roomResult.value);
  }

  async find(
    tenant: string,
    page: number,
    pageSize: number,
    name?: string,
    includeInactive = false,
  ): Promise<Result<Room[], PersistenceError>> {
    const { limitPlusOne, offset } = getPageWindow(page, pageSize);
    const conditions: Sql[] = [sql`tenant = ${tenant}`];

    if (!includeInactive) {
      conditions.push(sql`active = TRUE`);
    }

    if (name) {
      conditions.push(sql`LOWER(name) LIKE ${`%${name.toLowerCase()}%`}`);
    }

    const rowsResult = await this.db.query<RoomRow>(sql`
      SELECT * FROM rooms
      WHERE ${join(conditions, ' AND ')}
      ORDER BY created_at DESC, id DESC
      LIMIT ${limitPlusOne}
      OFFSET ${offset}
    `);

    if (rowsResult.isErr()) {
      return err(rowsResult.error);
    }

    return ok(
      rowsResult.value.map((row) =>
        mapRecordFields(row, {
          geo: parseRoomGeo,
          public: toNullableBoolean,
          noPlayer: toNullableBoolean,
          active: toBoolean,
        }),
      ),
    );
  }

  async findById(
    tenant: string,
    roomId: string,
  ): Promise<Result<Room | null, PersistenceError>> {
    const rowResult = await this.db.queryOne<RoomRow>`
      SELECT * FROM rooms
      WHERE tenant = ${tenant}
      AND id = ${roomId}
    `;

    if (rowResult.isErr()) {
      return err(rowResult.error);
    }

    if (!rowResult.value) {
      return ok(null);
    }

    return ok(
      mapRecordFields(rowResult.value, {
        geo: parseRoomGeo,
        public: toNullableBoolean,
        noPlayer: toNullableBoolean,
        active: toBoolean,
      }),
    );
  }

  async updateById(
    tenant: string,
    roomId: string,
    input: RoomUpdateData,
  ): Promise<Result<void, PersistenceError>> {
    const changes: Sql[] = [];

    if (input.invite !== undefined) {
      changes.push(sql`invite = ${input.invite}`);
    }

    if (input.name !== undefined) {
      changes.push(sql`name = ${input.name}`);
    }

    if (input.playerName !== undefined) {
      changes.push(sql`player_name = ${input.playerName}`);
    }

    if (input.password !== undefined) {
      changes.push(sql`password = ${input.password}`);
    }

    if (input.public !== undefined) {
      changes.push(sql`\`public\` = ${input.public}`);
    }

    if (input.maxPlayers !== undefined) {
      changes.push(sql`max_players = ${input.maxPlayers}`);
    }

    if (input.geo !== undefined) {
      changes.push(sql`geo = ${toNullableJsonSqlColumn(input.geo)}`);
    }

    if (input.token !== undefined) {
      changes.push(sql`token = ${input.token}`);
    }

    if (input.noPlayer !== undefined) {
      changes.push(sql`no_player = ${input.noPlayer}`);
    }

    if (changes.length === 0) {
      return ok();
    }

    const updateResult = await this.db.query(sql`
      UPDATE rooms
      SET ${join(changes, ', ')}
      WHERE tenant = ${tenant}
      AND id = ${roomId}
    `);

    if (updateResult.isErr()) {
      return err(updateResult.error);
    }

    return ok();
  }

  async deactivateById(
    tenant: string,
    roomId: string,
  ): Promise<Result<void, PersistenceError>> {
    const updateResult = await this.db.query`
      UPDATE rooms
      SET active = FALSE,
          inactivated_at = COALESCE(inactivated_at, CURRENT_TIMESTAMP)
      WHERE tenant = ${tenant}
      AND id = ${roomId}
      AND active = TRUE
    `;

    if (updateResult.isErr()) {
      return err(updateResult.error);
    }

    return ok();
  }
}
