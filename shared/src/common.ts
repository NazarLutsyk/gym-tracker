import { z } from 'zod';

export const idSchema = z.coerce.number().int().positive();

export const dateSchema = z.iso.datetime();

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0),
});

export const paginated = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), total: z.number().int() });

export const apiErrorSchema = z.object({
  statusCode: z.number().int(),
  message: z.string(),
  issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});

export type Paginated<T> = { items: T[]; total: number };
export type ApiError = z.infer<typeof apiErrorSchema>;
