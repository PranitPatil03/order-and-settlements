import { z } from 'zod';

export const recordRefundSchema = z.object({
  amountCents: z.number().int().min(1).max(1_000_000_000),
  refundedAt: z.iso.datetime(),
  note: z.string().trim().max(1_000).nullable().optional(),
});
export type RecordRefundInput = z.infer<typeof recordRefundSchema>;
