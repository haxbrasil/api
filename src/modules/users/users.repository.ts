import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';
import sql, { join, Sql } from 'sql-template-tag';
import { MysqlError } from '../../common/errors/mysql-error.enum';
import { getPageWindow } from '../../common/pagination/utils/page.util';
import { UserPublicRow, UserCredentialsRow } from '../database/database';
import { DatabaseService } from '../database/database.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserAlreadyExistsError } from './users.error';
import { PersistenceError } from '../database/database.error';

@Injectable()
export class UsersRepository {
  constructor(private readonly db: DatabaseService) {}

  async find(
    tenant: string,
    page: number,
    pageSize: number,
    username?: string,
  ): Promise<Result<UserPublicRow[], PersistenceError>> {
    const { limitPlusOne, offset } = getPageWindow(page, pageSize);

    return username
      ? await this.db.query<UserPublicRow>`
          SELECT id, tenant, provider, provider_user_id, username, role, created_at
          FROM users
          WHERE tenant = ${tenant}
          AND username = ${username}
          ORDER BY created_at DESC, id DESC
          LIMIT ${limitPlusOne}
          OFFSET ${offset}
        `
      : await this.db.query<UserPublicRow>`
          SELECT id, tenant, provider, provider_user_id, username, role, created_at
          FROM users
          WHERE tenant = ${tenant}
          ORDER BY created_at DESC, id DESC
          LIMIT ${limitPlusOne}
          OFFSET ${offset}
        `;
  }

  async findByIdentity(
    provider: string,
    providerUserId: string,
    tenant: string,
  ): Promise<Result<UserPublicRow | null, PersistenceError>> {
    return await this.db.queryOne<UserPublicRow>`
      SELECT id, tenant, provider, provider_user_id, username, role, created_at
      FROM users
      WHERE tenant = ${tenant}
      AND provider = ${provider}
      AND provider_user_id = ${providerUserId}
    `;
  }

  async findById(
    userId: string,
    tenant: string,
  ): Promise<Result<UserPublicRow | null, PersistenceError>> {
    return await this.db.queryOne<UserPublicRow>`
      SELECT id, tenant, provider, provider_user_id, username, role, created_at
      FROM users
      WHERE tenant = ${tenant}
      AND id = ${userId}
    `;
  }

  async findCredentialsById(
    userId: string,
    tenant: string,
  ): Promise<Result<UserCredentialsRow | null, PersistenceError>> {
    return await this.db.queryOne<UserCredentialsRow>`
      SELECT provider_user_id, password FROM users
      WHERE tenant = ${tenant}
      AND id = ${userId}
    `;
  }

  async insertUser(
    input: CreateUserDto,
    tenant: string,
  ): Promise<Result<void, UserAlreadyExistsError | PersistenceError>> {
    const insertResult = await this.db.query`
      INSERT INTO users (tenant, provider, provider_user_id, username, password, role)
      VALUES (${tenant}, ${input.provider}, ${input.providerUserId}, ${input.username}, ${input.password ?? null}, ${input.role ?? 'default'})
    `;

    if (insertResult.isErr()) {
      switch (insertResult.error.code) {
        case MysqlError.DUP_ENTRY:
          return err({
            type: 'user_already_exists',
          });
        default:
          return err(insertResult.error);
      }
    }

    return ok();
  }

  async updateById(
    userId: string,
    input: UpdateUserDto,
    tenant: string,
  ): Promise<Result<void, UserAlreadyExistsError | PersistenceError>> {
    const changes: Sql[] = [];

    if (input.username !== undefined) {
      changes.push(sql`username = ${input.username}`);
    }

    if (input.password !== undefined) {
      changes.push(sql`password = ${input.password}`);
    }

    if (input.role !== undefined) {
      changes.push(sql`role = ${input.role}`);
    }

    if (changes.length === 0) {
      return ok();
    }

    const updateResult = await this.db.query(sql`
      UPDATE users
      SET ${join(changes, ', ')}
      WHERE tenant = ${tenant}
      AND id = ${userId}
    `);

    if (updateResult.isErr()) {
      switch (updateResult.error.code) {
        case MysqlError.DUP_ENTRY:
          return err({
            type: 'user_already_exists',
          });
        default:
          return err(updateResult.error);
      }
    }

    return ok();
  }
}
