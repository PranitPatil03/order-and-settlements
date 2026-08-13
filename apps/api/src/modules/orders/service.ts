import { AppError } from '../../common/errors/app-error.js';
import { calculateOrderTotals } from '../../domain/order-totals.js';
import { parseObjectId } from '../../common/utils/object-id.js';
import {
  createOrder,
  findOrderById,
  findOrdersPage,
  findOrdersForExport,
  softDeleteOrder,
  updateOrder,
} from './repository.js';
import { assertOrderCanBeDeleted, assertOrderCanChangeLineItems } from './policy.js';
import type {
  CreateOrderInput,
  ExportOrdersInput,
  ListOrdersInput,
  UpdateOrderInput,
} from './schema.js';
import { toOrderResponse } from './mapper.js';

const getOrderOrThrow = async (userId: string, orderId: string) => {
  const order = await findOrderById(userId, parseObjectId(orderId, 'orderId'));

  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 'Order was not found.', 404);
  }

  return order;
};

export const createOrderUseCase = async (userId: string, input: CreateOrderInput) => {
  const totals = calculateOrderTotals(input.lineItems);
  const order = await createOrder(userId, input, totals.lineItems);
  return toOrderResponse(order);
};

export const listOrdersUseCase = async (userId: string, input: ListOrdersInput) => {
  const { items, total } = await findOrdersPage(userId, input);
  const orders = items.map(toOrderResponse);

  return {
    items: orders,
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.ceil(total / input.limit),
    },
  };
};

export const exportOrdersUseCase = async (userId: string, input: ExportOrdersInput) => {
  if (input.from && input.to && input.from > input.to)
    throw new AppError('INVALID_DATE_RANGE', '`from` must be before `to`.', 400);
  return (await findOrdersForExport(userId, input.from, input.to)).map(toOrderResponse);
};

export const getOrderUseCase = async (userId: string, orderId: string) => {
  return toOrderResponse(await getOrderOrThrow(userId, orderId));
};

export const updateOrderUseCase = async (
  userId: string,
  orderId: string,
  input: UpdateOrderInput,
) => {
  const currentOrder = await getOrderOrThrow(userId, orderId);

  if (input.lineItems !== undefined) {
    assertOrderCanChangeLineItems(currentOrder);
  }

  const lineItems =
    input.lineItems === undefined ? undefined : calculateOrderTotals(input.lineItems).lineItems;
  const updatedOrder = await updateOrder(userId, currentOrder._id, input, lineItems);

  if (!updatedOrder) {
    throw new AppError('ORDER_NOT_FOUND', 'Order was not found.', 404);
  }

  return toOrderResponse(updatedOrder);
};

export const deleteOrderUseCase = async (userId: string, orderId: string) => {
  const currentOrder = await getOrderOrThrow(userId, orderId);
  assertOrderCanBeDeleted(currentOrder);
  await softDeleteOrder(userId, currentOrder._id);
};
