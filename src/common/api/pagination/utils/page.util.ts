import { Page, PageWindow } from '../types/page.type';

export function getPageWindow(page: number, pageSize: number): PageWindow {
  return {
    limitPlusOne: pageSize + 1,
    offset: (page - 1) * pageSize,
  };
}

export function paginate<T>(
  rows: T[],
  page: number,
  pageSize: number,
): Page<T> {
  const hasNextPage = rows.length > pageSize;
  const items = hasNextPage ? rows.slice(0, pageSize) : rows;

  return {
    items,
    pageInfo: {
      page,
      pageSize,
      hasNextPage,
    },
  };
}
