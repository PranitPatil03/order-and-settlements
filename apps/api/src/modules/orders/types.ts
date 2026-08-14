import type { ObjectId } from 'mongodb';

import type { CalculatedLineItem } from '../../domain/order-totals.js';

export type OrderDocument = {
  _id: ObjectId;
  userId: string;
  customerId: string | null;
  customer: string;
  dueDate: string;
  currency: string;
  lineItems: CalculatedLineItem[];
  subtotalCents: number;
  taxRateBps?: number;
  taxCents?: number;
  totalCents: number;
  grossPaidCents: number;
  refundedTotalCents: number;
  paymentLinkTokenHash: string | null;
  paymentLinkAccessCodeHash: string | null;
  paymentLinkCreatedAt: Date | null;
  paymentLinkRevokedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderResponse = {
  id: string;
  customerId: string | null;
  customer: string;
  dueDate: string;
  currency: string;
  lineItems: CalculatedLineItem[];
  subtotalCents: number;
  taxRateBps: number;
  taxCents: number;
  totalCents: number;
  grossPaidCents: number;
  refundedTotalCents: number;
  netPaidCents: number;
  amountDueCents: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicOrderResponse = OrderResponse & {
  paymentLinkActive: boolean;
};
