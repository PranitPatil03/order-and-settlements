import type { ObjectId } from 'mongodb';

import type { CalculatedLineItem } from '../../domain/order-totals.js';

export type OrderDocument = {
  _id: ObjectId;
  userId: string;
  customer: string;
  dueDate: string;
  currency: string;
  lineItems: CalculatedLineItem[];
  subtotalCents: number;
  totalCents: number;
  grossPaidCents: number;
  refundedTotalCents: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderResponse = {
  id: string;
  customer: string;
  dueDate: string;
  currency: string;
  lineItems: CalculatedLineItem[];
  subtotalCents: number;
  totalCents: number;
  grossPaidCents: number;
  refundedTotalCents: number;
  netPaidCents: number;
  amountDueCents: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};
