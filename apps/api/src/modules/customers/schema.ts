import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  companyName: z.string().trim().max(200).optional().or(z.literal('')),
  email: z.email().max(320),
  phone: z.string().trim().max(50).optional().or(z.literal('')),
  billingAddress: z.string().trim().max(1000).optional().or(z.literal('')),
  shippingAddress: z.string().trim().max(1000).optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const customerIdSchema = z.object({
  customerId: z.string().min(1),
});

export const listCustomersSchema = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ListCustomersInput = z.infer<typeof listCustomersSchema>;
