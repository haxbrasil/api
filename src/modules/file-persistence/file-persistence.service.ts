import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { err, ok, Result } from 'neverthrow';
import { EnvSchema } from '../../env/env.schema';
import { FilePersistenceError } from './file-persistence.error';
import { PutObjectInput } from './types/put-object-input.type';
import { StoredObject } from './types/stored-object.type';
import { normalizePublicBaseUrl } from './utils/normalize-public-base-url.util';

@Injectable()
export class FilePersistenceService {
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(
    @Inject('S3_CLIENT') private readonly client: S3Client,
    config: ConfigService<EnvSchema, true>,
  ) {
    this.bucket = config.getOrThrow('FILE_STORAGE_RECS_BUCKET', {
      infer: true,
    });
    this.publicBaseUrl = normalizePublicBaseUrl(
      config.getOrThrow('FILE_STORAGE_RECS_PUBLIC_BASE_URL', {
        infer: true,
      }),
    );
  }

  buildPublicUrl(objectKey: string): string {
    return `${this.publicBaseUrl}/${objectKey}`;
  }

  async putObject(
    input: PutObjectInput,
  ): Promise<Result<StoredObject, FilePersistenceError>> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType,
        }),
      );

      return ok({
        key: input.key,
        url: this.buildPublicUrl(input.key),
      });
    } catch (error: unknown) {
      const code =
        typeof error === 'object' && error !== null && 'name' in error
          ? (error as { name?: string }).name
          : undefined;

      return err({
        type: 'file_persistence_error',
        cause: error,
        code,
      });
    }
  }
}
