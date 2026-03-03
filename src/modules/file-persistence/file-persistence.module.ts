import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { EnvSchema } from '../../env/env.schema';
import { FilePersistenceService } from './file-persistence.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'S3_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvSchema, true>) =>
        new S3Client({
          endpoint: config.getOrThrow('FILE_STORAGE_ENDPOINT', { infer: true }),
          region: config.getOrThrow('FILE_STORAGE_REGION', { infer: true }),
          forcePathStyle: config.get('FILE_STORAGE_FORCE_PATH_STYLE', {
            infer: true,
          }),
          credentials: {
            accessKeyId: config.getOrThrow('FILE_STORAGE_ACCESS_KEY_ID', {
              infer: true,
            }),
            secretAccessKey: config.getOrThrow(
              'FILE_STORAGE_SECRET_ACCESS_KEY',
              { infer: true },
            ),
          },
        }),
    },
    FilePersistenceService,
  ],
  exports: [FilePersistenceService],
})
export class FilePersistenceModule {}
