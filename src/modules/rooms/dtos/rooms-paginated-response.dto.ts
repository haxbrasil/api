import { PaginationDto } from '../../../common/pagination/dtos/pagination.dto';
import { Room } from '../types/room.type';
import { RoomListItemResponseDto } from './room-list-item-response.dto';

export class RoomsPaginatedResponseDto extends PaginationDto(
  RoomListItemResponseDto,
  (room: Room) => new RoomListItemResponseDto(room),
) {}
