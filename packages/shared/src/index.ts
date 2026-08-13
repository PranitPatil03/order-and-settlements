import { z } from 'zod';

export const orderStatusSchema = z.enum(['pending', 'partially_paid', 'paid', 'overdue']);

export type OrderStatus = z.infer<typeof orderStatusSchema>;
