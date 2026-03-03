import { ApiProperty } from '@nestjs/swagger';
import { RecordingCode } from '../types/recording-code.type';

export class RecordingCodeResponseDto {
  @ApiProperty({ example: 'A1B2C3' })
  code: string;

  constructor(recording: RecordingCode) {
    this.code = recording.code;
  }
}
