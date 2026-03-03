import { Module } from '@nestjs/common';
import { RecordingsController } from './recordings.controller';
import { RecordingsRepository } from './recordings.repository';
import { RecordingsService } from './recordings.service';

@Module({
  controllers: [RecordingsController],
  providers: [RecordingsRepository, RecordingsService],
})
export class RecordingsModule {}
