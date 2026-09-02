import { z } from 'zod';

const nonEmpty = z.string().trim().min(1);
export const productIdSchema = z.object({ id: z.string().uuid() });
export const productQuerySchema = z.object({ search: z.string().trim().optional() });
export const productBodySchema = z.object({
  name: nonEmpty.max(160),
  description: z.string().max(2000).default(''),
  category: nonEmpty.max(80),
  unit: nonEmpty.max(40),
  cost: z.number().nonnegative(),
  minimumStock: z.number().nonnegative(),
  active: z.boolean().default(true),
  supplierIds: z.array(z.string().uuid()).default([]),
  warehouseIds: z.array(z.string().uuid()).default([]),
});
export const productPatchSchema = productBodySchema.partial();
export type ProductBody = z.infer<typeof productBodySchema>;
