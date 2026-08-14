import type { Request, Response } from 'express';

import { AppError } from '../../common/errors/app-error.js';
import type { AuthenticatedRequest } from '../../auth/auth.middleware.js';
import {
  createCustomerUseCase,
  deleteCustomerUseCase,
  getCustomerUseCase,
  listCustomersUseCase,
  updateCustomerUseCase,
} from './service.js';
import { createCustomerSchema, customerIdSchema, listCustomersSchema, updateCustomerSchema } from './schema.js';

const getUserId = (request: Request) => {
  const userId = (request as AuthenticatedRequest).user?.id;

  if (!userId) {
    throw new AppError('AUTH_REQUIRED', 'Authentication is required.', 401);
  }

  return userId;
};

export const createCustomer = async (request: Request, response: Response) => {
  const input = createCustomerSchema.parse(request.body);
  response.status(201).json({ data: await createCustomerUseCase(getUserId(request), input) });
};

export const listCustomers = async (request: Request, response: Response) => {
  const input = listCustomersSchema.parse(request.query);
  response.status(200).json({ data: await listCustomersUseCase(getUserId(request), input) });
};

export const getCustomer = async (request: Request, response: Response) => {
  const { customerId } = customerIdSchema.parse(request.params);
  response.status(200).json({ data: await getCustomerUseCase(getUserId(request), customerId) });
};

export const updateCustomer = async (request: Request, response: Response) => {
  const { customerId } = customerIdSchema.parse(request.params);
  const input = updateCustomerSchema.parse(request.body);
  response.status(200).json({ data: await updateCustomerUseCase(getUserId(request), customerId, input) });
};

export const deleteCustomer = async (request: Request, response: Response) => {
  const { customerId } = customerIdSchema.parse(request.params);
  await deleteCustomerUseCase(getUserId(request), customerId);
  response.status(204).send();
};
