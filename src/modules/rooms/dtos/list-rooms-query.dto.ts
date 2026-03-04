import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';
import { SnakePagePaginationQueryDto } from '../../../common/api/pagination/dtos/snake-page-pagination-query.dto';

export class ListRoomsQueryDto extends SnakePagePaginationQueryDto {
  @ApiPropertyOptional({
    minLength: 1,
    maxLength: 150,
    example: 'Hax Brasil Room #1',
  })
  @IsOptional()
  @IsString()
  @Length(1, 150)
  name?: string;

  @ApiPropertyOptional({ name: 'include_inactive', default: false })
  @IsOptional()
  @IsBoolean()
  include_inactive: boolean = false;
}
