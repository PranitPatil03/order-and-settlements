import type { OrderStatus } from '@orders-and-settlements/shared';

export type StatusSnapshot = {
  totalCents: number;
  grossPaidCents: number;
  refundedTotalCents: number;
  dueDate: string;
  today?: string;
};

export const calculateNetPaidCents = ({ grossPaidCents, refundedTotalCents }: StatusSnapshot) => {
  return Math.max(0, grossPaidCents - refundedTotalCents);
};

export const calculateRemainingBalanceCents = (snapshot: StatusSnapshot) => {
  return Math.max(0, snapshot.totalCents - calculateNetPaidCents(snapshot));
};

export const calculateOrderStatus = (snapshot: StatusSnapshot): OrderStatus => {
  const netPaidCents = calculateNetPaidCents(snapshot);
  const today = snapshot.today ?? new Date().toISOString().slice(0, 10);

  if (netPaidCents >= snapshot.totalCents) {
    return 'paid';
  }

  if (snapshot.dueDate < today) {
    return 'overdue';
  }

  if (netPaidCents > 0) {
    return 'partially_paid';
  }

  return 'pending';
};
