import { PaginationDto } from '../../../common/pagination/dtos/pagination.dto';
import { RecordingCode } from '../types/recording-code.type';
import { RecordingCodeResponseDto } from './recording-code-response.dto';

export class RecordingsPaginatedResponseDto extends PaginationDto(
  RecordingCodeResponseDto,
  (recording: RecordingCode) => new RecordingCodeResponseDto(recording),
) {}
