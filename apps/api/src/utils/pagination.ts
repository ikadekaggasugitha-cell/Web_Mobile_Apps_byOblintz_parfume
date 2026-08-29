export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function parsePagination(query: { page?: string; limit?: string }, defaults?: { page?: number; limit?: number; maxLimit?: number }): PaginationParams {
  const maxLimit = defaults?.maxLimit ?? 100;
  const defaultPage = defaults?.page ?? 1;
  const defaultLimit = defaults?.limit ?? 20;

  const page = Math.max(1, parseInt(query.page || String(defaultPage)) || defaultPage);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit || String(defaultLimit)) || defaultLimit));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
