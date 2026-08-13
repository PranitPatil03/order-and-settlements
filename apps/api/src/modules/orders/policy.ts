import { AppError } from '../../common/errors/app-error.js';
import type { OrderDocument } from './types.js';

export const assertOrderCanChangeLineItems = (order: OrderDocument) => {
  if (order.grossPaidCents > 0 || order.refundedTotalCents > 0) {
    throw new AppError(
      'ORDER_FINANCIAL_FIELDS_LOCKED',
      'Line items cannot be changed after financial activity has been recorded.',
      409,
    );
  }
};

export const assertOrderCanBeDeleted = (order: OrderDocument) => {
  if (order.grossPaidCents > 0 || order.refundedTotalCents > 0) {
    throw new AppError(
      'ORDER_HAS_FINANCIAL_ACTIVITY',
      'An order with financial activity cannot be deleted.',
      409,
    );
  }
};
