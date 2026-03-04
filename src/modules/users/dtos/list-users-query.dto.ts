import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
import { PagePaginationQueryDto } from '../../../common/api/pagination/dtos/page-pagination-query.dto';

export class ListUsersQueryDto extends PagePaginationQueryDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 25, example: 'Alice' })
  @IsOptional()
  @IsString()
  @Length(1, 25)
  username?: string;
}
