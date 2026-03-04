import { PaginationDto } from '../../../common/api/pagination/dtos/pagination.dto';
import { UserPublicRow } from '../../database/database';
import { UserResponseDto } from './user-response.dto';

export class UsersPaginatedResponseDto extends PaginationDto(
  UserResponseDto,
  (user: UserPublicRow) => new UserResponseDto(user),
) {}
