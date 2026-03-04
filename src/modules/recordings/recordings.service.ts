import * as crypto from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { tryDecode, validate } from '@hax-brasil/replay-decoder';
import { err, ok, Result } from 'neverthrow';
import { Page } from '../../common/api/pagination/types/page.type';
import { paginate } from '../../common/api/pagination/utils/page.util';
import { RecordingCodeRow } from '../database/database';
import { FilePersistenceError } from '../file-persistence/file-persistence.error';
import { FilePersistenceService } from '../file-persistence/file-persistence.service';
import { PersistenceError } from '../database/database.error';
import {
  RecordingCodeGenerationExhaustedError,
  RecordingInvalidError,
  RecordingNotFoundError,
} from './types/recording-error.type';
import { RecordingsRepository } from './recordings.repository';
import { Recording } from './types/recording.type';
import { generateRecordingCode } from './utils/recording-code.util';
import { buildRecordingStorageKey } from './utils/recording-storage-key.util';
import { hasValidationErrors } from './utils/recording-validation.util';

const MAX_RECORDING_CODE_ATTEMPTS = 20;

@Injectable()
export class RecordingsService {
  constructor(
    private readonly repo: RecordingsRepository,
    private readonly filePersistence: FilePersistenceService,
  ) {}

  async create(
    tenant: string,
    file: Buffer,
    contentType: string,
  ): Promise<
    Result<
      Recording,
      | RecordingInvalidError
      | RecordingCodeGenerationExhaustedError
      | PersistenceError
      | FilePersistenceError
    >
  > {
    const decodeResult = tryDecode(file, { validationProfile: 'strict' });

    if (!decodeResult.ok) {
      return err({ type: 'recording_invalid' });
    }

    const validationReport = validate(file, 'strict');

    if (hasValidationErrors(validationReport)) {
      return err({ type: 'recording_invalid' });
    }

    for (let attempt = 0; attempt < MAX_RECORDING_CODE_ATTEMPTS; attempt += 1) {
      const code = generateRecordingCode((maxExclusive) =>
        crypto.randomInt(0, maxExclusive),
      );
      const recordingUuid = crypto.randomUUID();
      const objectKey = buildRecordingStorageKey(tenant, code, recordingUuid);
      const url = this.filePersistence.buildPublicUrl(objectKey);

      const insertResult = await this.repo.insert({
        tenant,
        code,
        recordingUuid,
        url,
      });

      if (insertResult.isErr()) {
        if (insertResult.error.type === 'recording_code_collision') {
          continue;
        }

        return err(insertResult.error);
      }

      const uploadResult = await this.filePersistence.putObject({
        key: objectKey,
        body: file,
        contentType,
      });

      if (uploadResult.isErr()) {
        await this.repo.deleteByCode(tenant, code);

        return err(uploadResult.error);
      }

      return ok(insertResult.value);
    }

    return err({
      type: 'recording_code_generation_exhausted',
    });
  }

  async getByCode(
    tenant: string,
    code: string,
  ): Promise<Result<Recording, RecordingNotFoundError | PersistenceError>> {
    const recordingResult = await this.repo.findByCode(tenant, code);

    if (recordingResult.isErr()) {
      return err(recordingResult.error);
    }

    if (!recordingResult.value) {
      return err({
        type: 'recording_not_found',
        code,
      });
    }

    return ok(recordingResult.value);
  }

  async list(
    tenant: string,
    page: number,
    pageSize: number,
  ): Promise<Result<Page<RecordingCodeRow>, PersistenceError>> {
    return await this.repo
      .listCodes(tenant, page, pageSize)
      .then((result) => result.map((rows) => paginate(rows, page, pageSize)));
  }
}
