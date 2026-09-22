export type PageParams = { page: number; pageSize: number };

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ParsePageParamsOptions = {
  defaultPageSize: number;
  maxPageSize: number;
};

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) && n >= 1 ? n : null;
}

export function parsePageParams(
  searchParams: { page?: string; pageSize?: string },
  options: ParsePageParamsOptions
): PageParams {
  const page = parsePositiveInt(searchParams.page) ?? 1;
  const requestedPageSize = parsePositiveInt(searchParams.pageSize) ?? options.defaultPageSize;
  const pageSize = Math.min(requestedPageSize, options.maxPageSize);
  return { page, pageSize };
}
