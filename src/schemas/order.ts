import { z } from 'zod';

const orderStatus = z.enum(['pending', 'approved', 'received', 'cancelled']);
const orderItem = z.object({
  productId: z.string().uuid(),
  quantity: z.number().finite().positive(),
});
export const orderIdSchema = z.object({ id: z.string().uuid() });
export const orderBodySchema = z
  .object({
    status: orderStatus.default('pending'),
    notes: z.string().max(2000).default(''),
    items: z.array(orderItem).min(1).max(200),
  })
  .superRefine((value, context) => {
    if (new Set(value.items.map((item) => item.productId)).size !== value.items.length)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['items'],
        message: 'Products must not be repeated',
      });
  });
export const orderPatchSchema = z
  .object({
    status: orderStatus.optional(),
    notes: z.string().max(2000).optional(),
    items: z.array(orderItem).min(1).max(200).optional(),
  })
  .superRefine((value, context) => {
    if (value.status === undefined && value.notes === undefined && value.items === undefined)
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'At least one field is required' });
    if (value.items && new Set(value.items.map((item) => item.productId)).size !== value.items.length)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['items'],
        message: 'Products must not be repeated',
      });
  });
export const orderQuerySchema = z.object({ status: orderStatus.optional() });
export type OrderBody = z.infer<typeof orderBodySchema>;
export type OrderPatch = z.infer<typeof orderPatchSchema>;
