import sql, { Sql } from 'sql-template-tag';

export function toJsonSqlColumn(value: unknown): Sql {
  return sql`CAST(${JSON.stringify(value)} AS JSON)`;
}

export function toNullableJsonSqlColumn(value: unknown): Sql {
  if (value === null || value === undefined) {
    return sql`NULL`;
  }

  return toJsonSqlColumn(value);
}
