import { ObjectId } from 'mongodb';

import { AppError } from '../../common/errors/app-error.js';
import { parseObjectId } from '../../common/utils/object-id.js';
import { toCustomerResponse } from './mapper.js';
import {
  createCustomer,
  findCustomerByEmail,
  findCustomerById,
  listCustomers,
  softDeleteCustomer,
  updateCustomer,
} from './repository.js';
import type { CreateCustomerInput, ListCustomersInput, UpdateCustomerInput } from './schema.js';

const isDuplicateKeyError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: unknown }).code === 11000;

const getCustomerOrThrow = async (userId: string, customerId: string) => {
  const customer = await findCustomerById(userId, parseObjectId(customerId, 'customerId'));

  if (!customer) {
    throw new AppError('CUSTOMER_NOT_FOUND', 'Customer was not found.', 404);
  }

  return customer;
};

export const createCustomerUseCase = async (userId: string, input: CreateCustomerInput) => {
  const existing = await findCustomerByEmail(userId, input.email);

  if (existing) {
    throw new AppError(
      'CUSTOMER_ALREADY_EXISTS',
      'A customer with this email already exists.',
      409,
    );
  }

  try {
    const customer = await createCustomer(userId, input);
    return toCustomerResponse(customer);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(
        'CUSTOMER_ALREADY_EXISTS',
        'A customer with this email already exists.',
        409,
      );
    }
    throw error;
  }
};

export const listCustomersUseCase = async (userId: string, input: ListCustomersInput) => {
  const result = await listCustomers(userId, input);

  return {
    items: result.items.map(toCustomerResponse),
    pagination: {
      page: input.page,
      limit: input.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / input.limit),
    },
  };
};

export const getCustomerUseCase = async (userId: string, customerId: string) => {
  return toCustomerResponse(await getCustomerOrThrow(userId, customerId));
};

export const updateCustomerUseCase = async (
  userId: string,
  customerId: string,
  input: UpdateCustomerInput,
) => {
  const current = await getCustomerOrThrow(userId, customerId);

  if (input.email && input.email.toLowerCase() !== current.email) {
    const existing = await findCustomerByEmail(userId, input.email);
    if (existing && existing._id.toString() !== current._id.toString()) {
      throw new AppError(
        'CUSTOMER_ALREADY_EXISTS',
        'A customer with this email already exists.',
        409,
      );
    }
  }

  let updated;
  try {
    updated = await updateCustomer(userId, new ObjectId(customerId), input);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(
        'CUSTOMER_ALREADY_EXISTS',
        'A customer with this email already exists.',
        409,
      );
    }
    throw error;
  }

  if (!updated) {
    throw new AppError('CUSTOMER_NOT_FOUND', 'Customer was not found.', 404);
  }

  return toCustomerResponse(updated);
};

export const deleteCustomerUseCase = async (userId: string, customerId: string) => {
  const current = await getCustomerOrThrow(userId, customerId);
  await softDeleteCustomer(userId, current._id);
};
