import { PaginationDto } from '../../../common/pagination/dtos/pagination.dto';
import { RecordingCodeRow } from '../../database/database';
import { RecordingCodeResponseDto } from './recording-code-response.dto';

export class RecordingsPaginatedResponseDto extends PaginationDto(
  RecordingCodeResponseDto,
  (recording: RecordingCodeRow) => new RecordingCodeResponseDto(recording),
) {}
