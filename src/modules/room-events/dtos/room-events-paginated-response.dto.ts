import { PaginationDto } from '../../../common/api/pagination/dtos/pagination.dto';
import { RoomEventRow } from '../../database/database';
import { RoomEventName } from '../types/room-event-name.type';
import { RoomEventResponseDto } from './room-event-response.dto';

export class RoomEventsPaginatedResponseDto extends PaginationDto(
  RoomEventResponseDto,
  (event: RoomEventRow<RoomEventName>) => new RoomEventResponseDto(event),
) {}
