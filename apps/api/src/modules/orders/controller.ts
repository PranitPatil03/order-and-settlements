import type { Request, Response } from 'express';

import { AppError } from '../../common/errors/app-error.js';
import type { AuthenticatedRequest } from '../../auth/auth.middleware.js';
import {
  createOrderUseCase,
  deleteOrderUseCase,
  getOrderUseCase,
  listOrdersUseCase,
  updateOrderUseCase,
} from './service.js';
import { createOrderSchema, listOrdersSchema, orderIdSchema, updateOrderSchema } from './schema.js';

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
