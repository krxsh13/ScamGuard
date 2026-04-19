import { Document, Model, Query } from 'mongoose';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Reusable pagination helper for Mongoose queries
 * @param model - Mongoose model to query
 * @param query - MongoDB query filter
 * @param options - Pagination options (page, limit, sort)
 * @returns { data, total, page, limit, totalPages }
 */
export async function paginate<T extends Document>(
  model: Model<T>,
  query: Record<string, any> = {},
  options: PaginationOptions = {}
): Promise<PaginationResult<T>> {
  // Extract pagination params with defaults
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(options.limit || 20, 100)); // Cap at 100

  // Parse sort string (e.g., "createdAt:desc" or "createdAt")
  let sortObj: Record<string, 1 | -1> = { createdAt: -1 }; // Default sort
  if (options.sort) {
    const parts = options.sort.split(':');
    const field = parts[0];
    const direction = parts[1]?.toLowerCase() === 'asc' ? 1 : -1;
    sortObj = { [field]: direction };
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Execute queries in parallel
  const [data, total] = await Promise.all([
    model
      .find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .exec(),
    model.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    total,
    page,
    limit,
    totalPages,
  };
}
