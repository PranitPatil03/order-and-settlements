import { z } from 'zod';

const lineItemSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.number().int().min(1).max(1_000_000),
  unitPriceCents: z.number().int().min(1).max(1_000_000_000),
});

export const orderCurrencySchema = z.enum(['USD', 'INR', 'EUR', 'GBP']);

export const createOrderSchema = z
  .object({
    customerId: z.string().trim().min(1).optional(),
    customer: z.string().trim().min(1).max(200).optional(),
    dueDate: z.iso.date(),
    currency: orderCurrencySchema.default('USD'),
    taxRateBps: z.number().int().min(0).max(10_000).default(0),
    lineItems: z.array(lineItemSchema).min(1).max(100),
  })
  .refine((value) => Boolean(value.customerId || value.customer), {
    message: 'Either customerId or customer name is required.',
    path: ['customer'],
  });

export const updateOrderSchema = z.object({
  customerId: z.string().trim().min(1).optional(),
  customer: z.string().trim().min(1).max(200).optional(),
  dueDate: z.iso.date().optional(),
  lineItems: z.array(lineItemSchema).min(1).max(100).optional(),
  taxRateBps: z.number().int().min(0).max(10_000).optional(),
});

export const listOrdersSchema = z.object({
  q: z.string().trim().optional(),
  customerId: z.string().trim().optional(),
  refunded: z.coerce.boolean().optional(),
  status: z.enum(['pending', 'partially_paid', 'paid', 'overdue']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

export const exportOrdersSchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});

export const orderIdSchema = z.object({
  orderId: z.string().min(1),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type ListOrdersInput = z.infer<typeof listOrdersSchema>;
export type ExportOrdersInput = z.infer<typeof exportOrdersSchema>;
