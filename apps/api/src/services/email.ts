import { Resend } from 'resend';

import { env } from '../config/environment.js';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export const sendPaymentEmail = async ({
  to,
  orderNumber,
  amountDue,
  currency,
  paymentUrl,
  customerName,
}: {
  to: string;
  orderNumber: string;
  amountDue: number;
  currency: string;
  paymentUrl: string;
  customerName: string;
}) => {
  if (!resend || !env.RESEND_FROM_EMAIL) {
    return null;
  }

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amountDue / 100);
  const safeCustomerName = escapeHtml(customerName);
  const safeOrderNumber = escapeHtml(orderNumber);
  const safePaymentUrl = escapeHtml(paymentUrl);
  const safeAppName = escapeHtml(env.APP_NAME);

  return resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to,
    subject: `Pay your invoice ${safeOrderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827;">
        <h2>Hello ${safeCustomerName},</h2>
        <p>Your payment request for <strong>${safeOrderNumber}</strong> is ready.</p>
        <p>Amount due: <strong>${formatted}</strong></p>
        <p>
          <a href="${safePaymentUrl}" style="display:inline-block;background:#1d4ed8;color:white;padding:12px 20px;text-decoration:none;border-radius:8px;">
            Pay now
          </a>
        </p>
        <p>Thank you,<br />${safeAppName}</p>
      </div>
    `,
  });
};

export const sendPaymentConfirmationEmail = async ({
  to,
  orderNumber,
  amountPaid,
  amountDue,
  currency,
  paymentUrl,
  customerName,
}: {
  to: string;
  orderNumber: string;
  amountPaid: number;
  amountDue: number;
  currency: string;
  paymentUrl: string;
  customerName: string;
}) => {
  if (!resend || !env.RESEND_FROM_EMAIL) return null;

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100);
  const safeCustomerName = escapeHtml(customerName);
  const safeOrderNumber = escapeHtml(orderNumber);
  const safePaymentUrl = escapeHtml(paymentUrl);

  return resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to,
    subject: `Payment received for ${safeOrderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827;">
        <h2>Thank you, ${safeCustomerName}.</h2>
        <p>We received your Stripe payment for <strong>${safeOrderNumber}</strong>.</p>
        <p>Payment received: <strong>${formatAmount(amountPaid)}</strong></p>
        <p>Remaining balance: <strong>${formatAmount(amountDue)}</strong></p>
        <p><a href="${safePaymentUrl}">View payment details</a></p>
        <p>Thank you,<br />${escapeHtml(env.APP_NAME)}</p>
      </div>
    `,
  });
};
