import type { ObjectId } from 'mongodb';

export type RefundDocument = {
  _id: ObjectId;
  userId: string;
  orderId: ObjectId;
  amountCents: number;
  refundedAt: Date;
  note: string | null;
  idempotencyKey: string;
  createdAt: Date;
};
export type RefundResponse = {
  id: string;
  orderId: string;
  amountCents: number;
  refundedAt: string;
  note: string | null;
  createdAt: string;
};
