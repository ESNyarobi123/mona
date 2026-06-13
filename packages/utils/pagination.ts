export type PaginationParams = { page?: number; limit?: number };

export function parsePagination(searchParams: URLSearchParams, maxLimit = 100) {
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number(searchParams.get("limit") ?? 20) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function paginatedResult<T>(items: T[], total: number, page: number, limit: number) {
  return {
    items,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}
