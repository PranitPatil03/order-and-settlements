import Stripe from 'stripe';

import { AppError } from '../common/errors/app-error.js';
import { env } from '../config/environment.js';

export const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;

// Stripe applies a lower per-transaction limit to export transactions. Keep a
// small safety margin below the documented $26,165 / ₹2,500,000 boundary.
export const getStripeCheckoutMaximumCents = (currency: string) => {
  switch (currency.toUpperCase()) {
    case 'USD':
      return 2_600_000;
    case 'INR':
      return 249_000_000;
    default:
      return 99_000_000;
  }
};

export const createCheckoutSession = async ({
  orderId,
  userId,
  customerEmail,
  customerName,
  amountCents,
  currency,
  successUrl,
  cancelUrl,
}: {
  orderId: string;
  userId: string;
  customerEmail?: string;
  customerName: string;
  amountCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
}) => {
  if (!stripe) {
    throw new AppError(
      'STRIPE_NOT_CONFIGURED',
      'Stripe payments are not configured. Add STRIPE_SECRET_KEY to the API environment.',
      503,
    );
  }

  return stripe.checkout.sessions.create({
    mode: 'payment',
    ...(customerEmail ? { customer_email: customerEmail } : {}),
    line_items: [
      {
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: amountCents,
          product_data: {
            name: `Order ${orderId}`,
            description: `Payment for ${customerName}`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      orderId,
      userId,
      customerName,
      ...(customerEmail ? { customerEmail } : {}),
    },
    payment_method_types: ['card'],
  });
};
