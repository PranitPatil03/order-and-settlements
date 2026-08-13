import { z } from 'zod';

const lineItemSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.number().int().min(1).max(1_000_000),
  unitPriceCents: z.number().int().min(1).max(1_000_000_000),
});

export const createOrderSchema = z.object({
  customer: z.string().trim().min(1).max(200),
  dueDate: z.iso.date(),
  currency: z.string().trim().length(3).default('USD'),
  lineItems: z.array(lineItemSchema).min(1).max(100),
});

export const updateOrderSchema = z.object({
  customer: z.string().trim().min(1).max(200).optional(),
  dueDate: z.iso.date().optional(),
  lineItems: z.array(lineItemSchema).min(1).max(100).optional(),
});

export const listOrdersSchema = z.object({
  status: z.enum(['pending', 'partially_paid', 'paid', 'overdue']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const orderIdSchema = z.object({
  orderId: z.string().min(1),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type ListOrdersInput = z.infer<typeof listOrdersSchema>;
