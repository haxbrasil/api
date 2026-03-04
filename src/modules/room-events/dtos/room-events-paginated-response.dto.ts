import { PaginationDto } from '../../../common/pagination/dtos/pagination.dto';
import { RoomEvent } from '../types/room-event.type';
import { RoomEventResponseDto } from './room-event-response.dto';

export class RoomEventsPaginatedResponseDto extends PaginationDto(
  RoomEventResponseDto,
  (event: RoomEvent) => new RoomEventResponseDto(event),
) {}
