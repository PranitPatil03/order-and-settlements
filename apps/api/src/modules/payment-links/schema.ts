import { z } from 'zod';

export const recordPublicPaymentSchema = z.object({
  amountCents: z.number().int().positive().max(1_000_000_000),
  note: z.string().trim().max(1_000).optional(),
});
