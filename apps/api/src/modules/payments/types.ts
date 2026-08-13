import type { ObjectId } from 'mongodb';

export type PaymentDocument = {
  _id: ObjectId;
  userId: string;
  orderId: ObjectId;
  amountCents: number;
  paidAt: Date;
  note: string | null;
  idempotencyKey: string;
  createdAt: Date;
};

export type PaymentResponse = {
  id: string;
  orderId: string;
  amountCents: number;
  paidAt: string;
  note: string | null;
  createdAt: string;
};
