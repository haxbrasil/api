import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';
import { ok as assert } from 'node:assert/strict';
import { MysqlError } from '../../common/persistence/errors/mysql-error.enum';
import { getPageWindow } from '../../common/api/pagination/utils/page.util';
import { RecordingCodeRow, RecordingRow } from '../database/database';
import { PersistenceError } from '../database/database.error';
import { DatabaseService } from '../database/database.service';
import { RecordingCodeCollisionError } from './types/recording-error.type';
import { RecordingInputData, Recording } from './types/recording.type';

@Injectable()
export class RecordingsRepository {
  constructor(private readonly db: DatabaseService) {}

  async insert(
    input: RecordingInputData,
  ): Promise<
    Result<Recording, RecordingCodeCollisionError | PersistenceError>
  > {
    const insertResult = await this.db.query`
      INSERT INTO recordings (tenant, code, recording_uuid, url)
      VALUES (${input.tenant}, ${input.code}, ${input.recordingUuid}, ${input.url})
    `;

    if (insertResult.isErr()) {
      switch (insertResult.error.code) {
        case MysqlError.DUP_ENTRY:
          return err({
            type: 'recording_code_collision',
            code: input.code,
            tenant: input.tenant,
          });
        default:
          return err(insertResult.error);
      }
    }

    const recordingResult = await this.findByCode(input.tenant, input.code);

    if (recordingResult.isErr()) {
      return err(recordingResult.error);
    }

    assert(
      recordingResult.value,
      'Invariant violated: expected recording to exist after insert',
    );

    return ok(recordingResult.value);
  }

  async findByCode(
    tenant: string,
    code: string,
  ): Promise<Result<Recording | null, PersistenceError>> {
    return await this.db.queryOne<RecordingRow>`
      SELECT * FROM recordings
      WHERE tenant = ${tenant}
      AND code = ${code}
    `;
  }

  async listCodes(
    tenant: string,
    page: number,
    pageSize: number,
  ): Promise<Result<RecordingCodeRow[], PersistenceError>> {
    const { limitPlusOne, offset } = getPageWindow(page, pageSize);

    return await this.db.query<RecordingCodeRow>`
      SELECT code FROM recordings
      WHERE tenant = ${tenant}
      ORDER BY created_at DESC, id DESC
      LIMIT ${limitPlusOne}
      OFFSET ${offset}
    `;
  }

  async deleteByCode(
    tenant: string,
    code: string,
  ): Promise<Result<void, PersistenceError>> {
    const deleteResult = await this.db.query`
      DELETE FROM recordings
      WHERE tenant = ${tenant}
      AND code = ${code}
    `;

    if (deleteResult.isErr()) {
      return err(deleteResult.error);
    }

    return ok();
  }
}
