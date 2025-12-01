/**
 * Pagination Utility Functions
 * @description Common pagination utilities to eliminate code duplication across services
 */

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginationQuery {
  skip: number;
  take: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Create pagination query options for Prisma
 * @param options.page - Current page number (1-indexed, defaults to 1)
 * @param options.limit - Number of items per page (defaults to 20)
 * @returns Prisma pagination options (skip, take)
 * @example
 * const { skip, take } = createPaginationQuery({ page: 2, limit: 10 });
 * // skip: 10, take: 10
 */
export function createPaginationQuery(options: PaginationOptions = {}): PaginationQuery {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.max(1, Math.min(100, options.limit ?? 20)); // Cap at 100

  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

/**
 * Create pagination metadata for API response
 * @param page - Current page number (1-indexed)
 * @param limit - Number of items per page
 * @param total - Total count of items
 * @returns Pagination metadata object
 * @example
 * const meta = createPaginationMeta(1, 20, 100);
 * // { page: 1, limit: 20, total: 100, totalPages: 5, hasMore: true }
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
  };
}

/**
 * Create a paginated result object
 * @param data - Array of items
 * @param page - Current page number
 * @param limit - Number of items per page
 * @param total - Total count of items
 * @returns Complete paginated response
 * @example
 * const result = createPaginatedResult(items, 1, 20, 100);
 */
export function createPaginatedResult<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedResult<T> {
  return {
    data,
    meta: createPaginationMeta(page, limit, total),
  };
}

/**
 * Higher-order function to paginate a Prisma query
 * @param prismaModel - Prisma model with findMany and count methods
 * @param where - Where clause for filtering
 * @param options - Pagination options
 * @param include - Include clause for relations
 * @param orderBy - Order by clause
 * @returns Promise of paginated result
 */
export async function paginateQuery<T, W>(
  prismaModel: {
    findMany: (args: { where?: W; skip?: number; take?: number; include?: unknown; orderBy?: unknown }) => Promise<T[]>;
    count: (args: { where?: W }) => Promise<number>;
  },
  options: {
    where?: W;
    page?: number;
    limit?: number;
    include?: unknown;
    orderBy?: unknown;
  },
): Promise<PaginatedResult<T>> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const { skip, take } = createPaginationQuery({ page, limit });

  const [data, total] = await Promise.all([
    prismaModel.findMany({
      where: options.where,
      skip,
      take,
      include: options.include,
      orderBy: options.orderBy,
    }),
    prismaModel.count({ where: options.where }),
  ]);

  return createPaginatedResult(data, page, limit, total);
}
