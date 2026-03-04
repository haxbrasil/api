import { ApiProperty } from '@nestjs/swagger';
import { RecordingCodeRow } from '../../database/database';

export class RecordingCodeResponseDto {
  @ApiProperty({ example: 'A1B2C3' })
  code: string;

  constructor(recording: RecordingCodeRow) {
    this.code = recording.code;
  }
}
