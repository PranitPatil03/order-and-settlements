import { AppError } from '../../common/errors/app-error.js';
import { calculateOrderTotals } from '../../domain/order-totals.js';
import { parseObjectId } from '../../common/utils/object-id.js';
import { logger } from '../../common/logger.js';
import { findCustomerById } from '../customers/repository.js';
import { sendPaymentEmail } from '../../services/email.js';
import { createPaymentLinkUseCase } from './payment-link.js';
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

const resolveOrderCustomer = async (
  userId: string,
  input: { customerId?: string; customer?: string },
) => {
  if (!input.customerId) {
    return {
      customerId: null,
      customerName: input.customer ?? 'Customer',
      customerEmail: null,
      companyName: null,
    };
  }

  const customer = await findCustomerById(userId, parseObjectId(input.customerId, 'customerId'));

  if (!customer) {
    throw new AppError('CUSTOMER_NOT_FOUND', 'Customer was not found.', 404);
  }

  return {
    customerId: customer._id.toHexString(),
    customerName: customer.name,
    customerEmail: customer.email,
    companyName: customer.companyName,
  };
};

export const createOrderUseCase = async (userId: string, input: CreateOrderInput) => {
  const customer = await resolveOrderCustomer(userId, input);

  const totals = calculateOrderTotals(input.lineItems, input.taxRateBps);

  const order = await createOrder(
    userId,
    { ...input, customerId: customer.customerId ?? undefined, customer: customer.customerName },
    totals.lineItems,
  );

  if (customer.customerEmail) {
    try {
      const paymentLink = await createPaymentLinkUseCase(userId, order._id.toHexString());

      await sendPaymentEmail({
        to: customer.customerEmail,
        orderNumber: order._id.toHexString(),
        amountDue: order.totalCents,
        totalCents: order.totalCents,
        currency: order.currency,
        paymentUrl: paymentLink.url,
        customerName: customer.customerName,
        companyName: customer.companyName,
        dueDate: order.dueDate,
        lineItems: order.lineItems,
        subtotalCents: order.subtotalCents,
        taxCents: order.taxCents,
        taxRateBps: order.taxRateBps,
      });
    } catch (error) {
      logger.error(
        {
          err: error,
          orderId: order._id.toHexString(),
          userId,
          customerEmail: customer.customerEmail,
        },
        'Failed to send payment email after order creation',
      );
    }
  }

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

  const customer =
    input.customerId === undefined
      ? undefined
      : await resolveOrderCustomer(userId, { customerId: input.customerId });
  const lineItems =
    input.lineItems === undefined
      ? undefined
      : calculateOrderTotals(input.lineItems, input.taxRateBps ?? currentOrder.taxRateBps)
          .lineItems;
  const updatedOrder = await updateOrder(
    userId,
    currentOrder._id,
    customer
      ? { ...input, customerId: customer.customerId ?? undefined, customer: customer.customerName }
      : input,
    lineItems,
    input.taxRateBps ?? currentOrder.taxRateBps,
  );

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
