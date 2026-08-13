import type { Request, Response } from 'express';

import { AppError } from '../../common/errors/app-error.js';
import type { AuthenticatedRequest } from '../../auth/auth.middleware.js';
import {
  createOrderUseCase,
  deleteOrderUseCase,
  getOrderUseCase,
  listOrdersUseCase,
  exportOrdersUseCase,
  updateOrderUseCase,
} from './service.js';
import { createPaymentLinkUseCase, revokePaymentLinkUseCase } from './payment-link.js';
import {
  createOrderSchema,
  exportOrdersSchema,
  listOrdersSchema,
  orderIdSchema,
  updateOrderSchema,
} from './schema.js';

const getUserId = (request: Request) => {
  const userId = (request as AuthenticatedRequest).user?.id;

  if (!userId) {
    throw new AppError('AUTH_REQUIRED', 'Authentication is required.', 401);
  }

  return userId;
};

export const createOrder = async (request: Request, response: Response) => {
  const input = createOrderSchema.parse(request.body);
  response.status(201).json({ data: await createOrderUseCase(getUserId(request), input) });
};

export const listOrders = async (request: Request, response: Response) => {
  const input = listOrdersSchema.parse(request.query);
  response.status(200).json({ data: await listOrdersUseCase(getUserId(request), input) });
};

const csv = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
export const exportOrders = async (request: Request, response: Response) => {
  const orders = await exportOrdersUseCase(
    getUserId(request),
    exportOrdersSchema.parse(request.query),
  );
  const rows = [
    [
      'order_id',
      'customer',
      'due_date',
      'currency',
      'total',
      'gross_paid',
      'refunded',
      'net_paid',
      'amount_due',
      'status',
      'created_at',
    ],
    ...orders.map((order) => [
      order.id,
      order.customer,
      order.dueDate,
      order.currency,
      order.totalCents,
      order.grossPaidCents,
      order.refundedTotalCents,
      order.netPaidCents,
      order.amountDueCents,
      order.status,
      order.createdAt,
    ]),
  ];
  response.setHeader('Content-Type', 'text/csv; charset=utf-8');
  response.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
  response.send(rows.map((row) => row.map(csv).join(',')).join('\n'));
};

export const getOrder = async (request: Request, response: Response) => {
  const { orderId } = orderIdSchema.parse(request.params);
  response.status(200).json({ data: await getOrderUseCase(getUserId(request), orderId) });
};

export const updateOrder = async (request: Request, response: Response) => {
  const { orderId } = orderIdSchema.parse(request.params);
  const input = updateOrderSchema.parse(request.body);
  response.status(200).json({ data: await updateOrderUseCase(getUserId(request), orderId, input) });
};

export const deleteOrder = async (request: Request, response: Response) => {
  const { orderId } = orderIdSchema.parse(request.params);
  await deleteOrderUseCase(getUserId(request), orderId);
  response.status(204).send();
};

export const createPaymentLink = async (request: Request, response: Response) => {
  const { orderId } = orderIdSchema.parse(request.params);
  response.status(201).json({ data: await createPaymentLinkUseCase(getUserId(request), orderId) });
};

export const revokePaymentLink = async (request: Request, response: Response) => {
  const { orderId } = orderIdSchema.parse(request.params);
  await revokePaymentLinkUseCase(getUserId(request), orderId);
  response.status(204).send();
};
