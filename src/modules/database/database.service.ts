import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';
import { Pool } from 'mysql2/promise';
import sql, { Sql } from 'sql-template-tag';
import { SnakeCasedProperties } from '../../common/persistence/types/case-conversion.type';
import { mapSnakeToCamel } from '../../common/persistence/snake-to-camel.util';
import { PersistenceError } from './database.error';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  constructor(@Inject('MYSQL_POOL') private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    q: Sql,
  ): Promise<Result<T[], PersistenceError>>;
  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<Result<T[], PersistenceError>>;
  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    q: Sql | TemplateStringsArray,
    ...values: unknown[]
  ): Promise<Result<T[], PersistenceError>> {
    const statement = this.toSql(q, values);
    return this.execute<T>(statement);
  }

  async queryOne<T extends Record<string, unknown> = Record<string, unknown>>(
    q: Sql,
  ): Promise<Result<T | null, PersistenceError>>;
  async queryOne<T extends Record<string, unknown> = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<Result<T | null, PersistenceError>>;
  async queryOne<T extends Record<string, unknown> = Record<string, unknown>>(
    q: Sql | TemplateStringsArray,
    ...values: unknown[]
  ): Promise<Result<T | null, PersistenceError>> {
    const statement = this.toSql(q, values);
    const rowsResult = await this.execute<T>(statement);

    if (rowsResult.isErr()) {
      return err(rowsResult.error);
    }

    return ok(rowsResult.value[0] ?? null);
  }

  private toSql(q: Sql | TemplateStringsArray, values: unknown[]): Sql {
    if (this.isTemplateStringsArray(q)) {
      return sql(q, ...values);
    }

    return q;
  }

  private isTemplateStringsArray(
    q: Sql | TemplateStringsArray,
  ): q is TemplateStringsArray {
    return Array.isArray(q);
  }

  private async execute<T extends Record<string, unknown>>(
    statement: Sql,
  ): Promise<Result<T[], PersistenceError>> {
    try {
      const [rows] = await this.pool.query(statement.text, statement.values);

      if (!Array.isArray(rows)) {
        return ok([]);
      }

      const mappedRows = (rows as SnakeCasedProperties<T>[]).map((row) =>
        mapSnakeToCamel<T>(row),
      );

      return ok(mappedRows);
    } catch (error: unknown) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? (error as { code?: string }).code
          : undefined;

      return err({
        type: 'persistence_error',
        cause: error,
        code,
      });
    }
  }
}
