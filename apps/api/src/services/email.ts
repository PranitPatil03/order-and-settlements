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
  dueDate,
  lineItems = [],
}: {
  to: string;
  orderNumber: string;
  amountDue: number;
  currency: string;
  paymentUrl: string;
  customerName: string;
  dueDate?: string;
  lineItems?: Array<{ description: string; quantity: number; lineTotalCents: number }>;
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
  const safeDueDate = dueDate ? escapeHtml(dueDate) : '';
  const itemsMarkup = lineItems
    .map(
      (item) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #e5ece7;">${escapeHtml(item.description)} × ${item.quantity}</td><td style="padding:10px 0;border-bottom:1px solid #e5ece7;text-align:right;">${new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(item.lineTotalCents / 100)}</td></tr>`,
    )
    .join('');

  return resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to,
    subject: `CrossVal payment request — Order ${safeOrderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 32px; color: #10231a; background:#f6f8f6;">
        <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #dce6df;border-radius:16px;overflow:hidden;">
          <div style="padding:24px 28px;background:#0b6b45;color:#fff;"><div style="font-size:20px;font-weight:700;">CrossVal</div><div style="margin-top:4px;font-size:13px;opacity:.82;">Order operations, made clear.</div></div>
          <div style="padding:28px;">
            <p style="margin:0;color:#0b6b45;font-weight:700;">CrossVal payment request</p>
            <h2 style="margin:10px 0 0;font-size:24px;">A payment request is ready for ${safeCustomerName}.</h2>
            <p style="color:#64756b;line-height:1.6;">Review the order details below and complete your payment securely through Stripe.</p>
            <table style="width:100%;border-collapse:collapse;margin:22px 0;font-size:14px;"><tbody>${itemsMarkup}</tbody></table>
            <div style="padding:16px;border-radius:12px;background:#e4f3eb;"><div style="font-size:12px;color:#557163;">Amount due</div><div style="margin-top:4px;font-size:24px;font-weight:700;color:#0b6b45;">${formatted}</div>${safeDueDate ? `<div style="margin-top:5px;font-size:13px;color:#557163;">Due ${safeDueDate}</div>` : ''}</div>
        <p>
          <a href="${safePaymentUrl}" style="display:inline-block;background:#0b6b45;color:white;padding:13px 22px;text-decoration:none;border-radius:10px;font-weight:700;">
            Review and pay securely
          </a>
        </p>
            <p style="color:#64756b;line-height:1.6;font-size:13px;">If you have questions about this request, reply to this email and our team will help.</p>
            <p style="color:#64756b;font-size:13px;">Thank you,<br /><strong>${safeAppName}</strong></p>
          </div>
        </div>
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
    subject: `CrossVal payment received — Order ${safeOrderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827;">
        <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #dce6df;border-radius:16px;overflow:hidden;">
        <div style="padding:24px 28px;background:#0b6b45;color:#fff;"><div style="font-size:20px;font-weight:700;">CrossVal</div><div style="margin-top:4px;font-size:13px;opacity:.82;">Payment confirmation</div></div>
        <div style="padding:28px;">
        <h2>CrossVal confirms your payment, ${safeCustomerName}.</h2>
        <p>We received your Stripe payment for <strong>${safeOrderNumber}</strong>.</p>
        <p>Payment received: <strong>${formatAmount(amountPaid)}</strong></p>
        <p>Remaining balance: <strong>${formatAmount(amountDue)}</strong></p>
        <p><a href="${safePaymentUrl}">View payment details</a></p>
        <p style="color:#64756b;">Your payment history will update automatically. Thank you,<br /><strong>${escapeHtml(env.APP_NAME)}</strong></p>
        </div></div>
      </div>
    `,
  });
};
