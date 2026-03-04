import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';
import { ok as assert } from 'node:assert/strict';
import { Page } from '../../common/pagination/types/page.type';
import { paginate } from '../../common/pagination/utils/page.util';
import { UserPublicRow } from '../database/database';
import { PersistenceError } from '../database/database.error';
import { ConfirmUserDto } from './dtos/confirm-user.dto';
import { CreateUserDto } from './dtos/create-user.dto';
import { ListUsersQueryDto } from './dtos/list-users-query.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { ConfirmationResult } from './types/confirmation-result.type';
import { UserAlreadyExistsError, UserNotFoundError } from './users.error';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async create(
    dto: CreateUserDto,
    tenant: string,
  ): Promise<Result<UserPublicRow, UserAlreadyExistsError | PersistenceError>> {
    const insertResult = await this.repo.insertUser(dto, tenant);

    if (insertResult.isErr()) {
      return err(insertResult.error);
    }

    const userResult = await this.repo.findByIdentity(
      dto.provider,
      dto.providerUserId,
      tenant,
    );

    if (userResult.isErr()) {
      return err(userResult.error);
    }

    assert(userResult.value, 'Invariant violated: expected user to exist');

    return ok(userResult.value);
  }

  async list(
    tenant: string,
    query: ListUsersQueryDto,
  ): Promise<Result<Page<UserPublicRow>, PersistenceError>> {
    return await this.repo
      .find(tenant, query.page, query.pageSize, query.username)
      .then((res) =>
        res.map((rows) => paginate(rows, query.page, query.pageSize)),
      );
  }

  async getByIdentity(
    provider: string,
    providerUserId: string,
    tenant: string,
  ): Promise<Result<UserPublicRow, UserNotFoundError | PersistenceError>> {
    const userResult = await this.repo.findByIdentity(
      provider,
      providerUserId,
      tenant,
    );

    if (userResult.isErr()) {
      return err(userResult.error);
    }

    if (!userResult.value) {
      return err({
        type: 'user_not_found',
        provider,
        providerUserId,
      });
    }

    return ok(userResult.value);
  }

  async update(
    userId: string,
    dto: UpdateUserDto,
    tenant: string,
  ): Promise<
    Result<
      UserPublicRow,
      UserNotFoundError | UserAlreadyExistsError | PersistenceError
    >
  > {
    const existingUserResult = await this.repo.findById(userId, tenant);

    if (existingUserResult.isErr()) {
      return err(existingUserResult.error);
    }

    if (!existingUserResult.value) {
      return err({
        type: 'user_not_found',
        userId,
      });
    }

    const updateResult = await this.repo.updateById(userId, dto, tenant);

    if (updateResult.isErr()) {
      return err(updateResult.error);
    }

    const userResult = await this.repo.findById(userId, tenant);

    if (userResult.isErr()) {
      return err(userResult.error);
    }

    assert(userResult.value, 'Invariant violated: expected user to exist');

    return ok(userResult.value);
  }

  async confirm(
    userId: string,
    dto: ConfirmUserDto,
    tenant: string,
  ): Promise<Result<ConfirmationResult, PersistenceError>> {
    const userResult = await this.repo.findCredentialsById(userId, tenant);

    if (userResult.isErr()) {
      return err(userResult.error);
    }

    if (!userResult.value) {
      return ok({
        isCorrect: false,
        providerUserId: null,
      });
    }

    return ok({
      isCorrect:
        userResult.value.password !== null &&
        userResult.value.password === dto.password,
      providerUserId: userResult.value.providerUserId,
    });
  }
}
