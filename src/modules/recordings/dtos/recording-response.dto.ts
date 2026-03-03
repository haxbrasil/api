import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { Recording } from '../types/recording.type';

export class RecordingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty({ name: 'recording_uuid' })
  @Expose({ name: 'recording_uuid' })
  recordingUuid: string;

  @ApiProperty()
  url: string;

  @ApiProperty({ name: 'created_at', type: String, format: 'date-time' })
  @Expose({ name: 'created_at' })
  createdAt: Date;

  constructor(recording: Recording) {
    this.id = recording.id;
    this.code = recording.code;
    this.recordingUuid = recording.recordingUuid;
    this.url = recording.url;
    this.createdAt = recording.createdAt;
  }
}
