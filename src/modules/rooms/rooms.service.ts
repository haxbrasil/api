import * as crypto from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ok as assert } from 'node:assert/strict';
import { err, ok, Result } from 'neverthrow';
import { Page } from '../../common/api/pagination/types/page.type';
import { paginate } from '../../common/api/pagination/utils/page.util';
import { PersistenceError } from '../database/database.error';
import { CreateRoomDto } from './dtos/create-room.dto';
import { ListRoomsQueryDto } from './dtos/list-rooms-query.dto';
import { UpdateRoomDto } from './dtos/update-room.dto';
import { RoomInactiveError, RoomNotFoundError } from './rooms.error';
import { RoomsRepository } from './rooms.repository';
import { Room, RoomUpdateData } from './types/room.type';

@Injectable()
export class RoomsService {
  constructor(private readonly repo: RoomsRepository) {}

  async create(
    tenant: string,
    input: CreateRoomDto,
  ): Promise<Result<Room, PersistenceError>> {
    return await this.repo.insert({
      id: crypto.randomUUID(),
      tenant,
      invite: input.invite,
      name: input.name,
      playerName: input.player_name,
      password: input.password,
      public: input.public,
      maxPlayers: input.max_players,
      geo: input.geo,
      token: input.token,
      noPlayer: input.no_player,
    });
  }

  async list(
    tenant: string,
    query: ListRoomsQueryDto,
  ): Promise<Result<Page<Room>, PersistenceError>> {
    return await this.repo
      .find(
        tenant,
        query.page,
        query.page_size,
        query.name,
        query.include_inactive,
      )
      .then((result) =>
        result.map((rooms) => paginate(rooms, query.page, query.page_size)),
      );
  }

  async getById(
    tenant: string,
    roomId: string,
  ): Promise<Result<Room, RoomNotFoundError | PersistenceError>> {
    const roomResult = await this.repo.findById(tenant, roomId);

    if (roomResult.isErr()) {
      return err(roomResult.error);
    }

    if (!roomResult.value) {
      return err({
        type: 'room_not_found',
        roomId,
      });
    }

    return ok(roomResult.value);
  }

  async update(
    tenant: string,
    roomId: string,
    input: UpdateRoomDto,
  ): Promise<
    Result<Room, RoomNotFoundError | RoomInactiveError | PersistenceError>
  > {
    const roomResult = await this.repo.findById(tenant, roomId);

    if (roomResult.isErr()) {
      return err(roomResult.error);
    }

    if (!roomResult.value) {
      return err({
        type: 'room_not_found',
        roomId,
      });
    }

    if (!roomResult.value.active) {
      return err({
        type: 'room_inactive',
        roomId,
      });
    }

    const updateData: RoomUpdateData = {
      invite: input.invite,
      name: input.name,
      playerName: input.player_name,
      password: input.password,
      public: input.public,
      maxPlayers: input.max_players,
      geo: input.geo,
      token: input.token,
      noPlayer: input.no_player,
    };

    const updateResult = await this.repo.updateById(tenant, roomId, updateData);

    if (updateResult.isErr()) {
      return err(updateResult.error);
    }

    const updatedRoomResult = await this.repo.findById(tenant, roomId);

    if (updatedRoomResult.isErr()) {
      return err(updatedRoomResult.error);
    }

    assert(
      updatedRoomResult.value,
      'Invariant violated: expected room after update',
    );

    return ok(updatedRoomResult.value);
  }

  async deactivate(
    tenant: string,
    roomId: string,
  ): Promise<Result<void, RoomNotFoundError | PersistenceError>> {
    const roomResult = await this.repo.findById(tenant, roomId);

    if (roomResult.isErr()) {
      return err(roomResult.error);
    }

    if (!roomResult.value) {
      return err({
        type: 'room_not_found',
        roomId,
      });
    }

    const deactivateResult = await this.repo.deactivateById(tenant, roomId);

    if (deactivateResult.isErr()) {
      return err(deactivateResult.error);
    }

    return ok();
  }
}
