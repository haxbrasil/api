import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { PageInfo } from '../types/page.type';

export class PageInfoDto {
  @ApiProperty()
  page: number;

  @ApiProperty({ name: 'page_size' })
  @Expose({ name: 'page_size' })
  pageSize: number;

  @ApiProperty({ name: 'has_next_page' })
  @Expose({ name: 'has_next_page' })
  hasNextPage: boolean;

  constructor(pageInfo: PageInfo) {
    this.page = pageInfo.page;
    this.pageSize = pageInfo.pageSize;
    this.hasNextPage = pageInfo.hasNextPage;
  }
}
