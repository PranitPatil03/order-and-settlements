import { createHash, createHmac } from 'node:crypto';

import { env } from '../../config/environment.js';
import { AppError } from '../../common/errors/app-error.js';
import { parseObjectId } from '../../common/utils/object-id.js';
import { toPublicOrderResponse } from './mapper.js';
import {
  findOrderById,
  findOrderByPaymentLinkHash,
  revokePaymentLink,
  savePaymentLink,
} from './repository.js';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const stableSecret = (orderId: string, purpose: string) =>
  createHmac('sha256', env.BETTER_AUTH_SECRET).update(`${purpose}:${orderId}`).digest('base64url');

export const createPaymentLinkUseCase = async (userId: string, orderIdValue: string) => {
  const orderId = parseObjectId(orderIdValue, 'orderId');
  const order = await findOrderById(userId, orderId);

  if (!order) throw new AppError('ORDER_NOT_FOUND', 'Order was not found.', 404);

  const token = stableSecret(orderId.toHexString(), 'payment-link');
  const accessCode = stableSecret(orderId.toHexString(), 'payment-code').slice(0, 10).toUpperCase();
  if (order.paymentLinkTokenHash && order.paymentLinkAccessCodeHash && !order.paymentLinkRevokedAt) {
    return {
      url: `${env.WEB_ORIGIN}/pay/${token}`,
      accessCode,
      createdAt: order.paymentLinkCreatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }
  const saved = await savePaymentLink(userId, orderId, hashToken(token), hashToken(accessCode));

  if (!saved) throw new AppError('ORDER_NOT_FOUND', 'Order was not found.', 404);

  return {
    url: `${env.WEB_ORIGIN}/pay/${token}`,
    accessCode,
    createdAt: saved.paymentLinkCreatedAt?.toISOString() ?? new Date().toISOString(),
  };
};

export const revokePaymentLinkUseCase = async (userId: string, orderIdValue: string) => {
  const order = await revokePaymentLink(userId, parseObjectId(orderIdValue, 'orderId'));
  if (!order) throw new AppError('ORDER_NOT_FOUND', 'Order was not found.', 404);
};

const getPublicOrderWithCode = async (token: string, accessCode: string) => {
  const order = await findOrderByPaymentLinkHash(hashToken(token));
  if (!order)
    throw new AppError('PAYMENT_LINK_INVALID', 'This payment link is invalid or expired.', 404);
  if (
    !order.paymentLinkAccessCodeHash ||
    hashToken(accessCode.toUpperCase()) !== order.paymentLinkAccessCodeHash
  ) {
    throw new AppError('PAYMENT_CODE_INVALID', 'The payment access code is incorrect.', 401);
  }
  return order;
};

export const getPublicOrderContextUseCase = async (token: string, accessCode: string) => {
  const order = await getPublicOrderWithCode(token, accessCode);
  return { order, publicOrder: toPublicOrderResponse(order) };
};
