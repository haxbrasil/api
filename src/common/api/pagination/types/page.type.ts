export type PageInfo = {
  page: number;
  pageSize: number;
  hasNextPage: boolean;
};

export type Page<T> = {
  items: T[];
  pageInfo: PageInfo;
};

export type PageWindow = {
  limitPlusOne: number;
  offset: number;
};
