import { z } from 'zod';

/** Schemas compartilhados entre módulos acadêmicos. */
export const uuidSchema = z.string().uuid();
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve ser YYYY-MM-DD');
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

export function range(p: Pagination) {
  const from = (p.page - 1) * p.pageSize;
  const to = from + p.pageSize - 1;
  return { from, to };
}
