import { z } from 'zod';

const text = z.string().trim().min(1);
export const idSchema = z.object({ id: z.string().uuid() });
export const listQuerySchema = z.object({ search: z.string().trim().optional() });

export const categorySchema = z.object({
  name: text.max(120),
  description: z.string().max(500).default(''),
  active: z.boolean().default(true),
});
export const warehouseSchema = z.object({
  name: text.max(120),
  description: z.string().max(500).default(''),
});
export const supplierSchema = z.object({
  name: text.max(160),
  contact: z.string().max(160).default(''),
  email: z.string().email().or(z.literal('')).default(''),
  phone: z.string().max(40).default(''),
  address: z.string().max(300).default(''),
  active: z.boolean().default(true),
});

export const inventoryQuerySchema = z.object({
  productId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
});
export const inventoryUpdateSchema = z.object({
  quantity: z.coerce.number().min(0),
});
export const inventoryCreateSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  quantity: z.coerce.number().min(0).default(0),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type WarehouseInput = z.infer<typeof warehouseSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
