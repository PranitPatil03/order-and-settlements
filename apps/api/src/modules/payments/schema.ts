import { z } from 'zod';

export const recordPaymentSchema = z.object({
  amountCents: z.number().int().min(1).max(1_000_000_000),
  paidAt: z.iso.datetime(),
  note: z.string().trim().max(1_000).nullable().optional(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
