'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { CreditCard, LoaderCircle, RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createPublicCheckoutSession,
  getPublicOrder,
  type Order,
  type Payment,
} from '@/lib/api-client';
import { formatDate, formatMoney, getDueSummary } from '@/lib/format';

const getStripeMaximumPaymentCents = (currency: string) => {
  switch (currency.toUpperCase()) {
    case 'USD':
      return 2_600_000;
    case 'INR':
      return 249_000_000;
    default:
      return 99_000_000;
  }
};

export function PublicPaymentPage({ token }: { token: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [openingCheckout, setOpeningCheckout] = useState(false);

  const load = useCallback(async () => {
    const result = await getPublicOrder(token);
    setOrder(result.order);
    setPayments(result.payments);
    setAmount(
      (current) =>
        current ||
        (
          Math.min(
            result.order.amountDueCents,
            getStripeMaximumPaymentCents(result.order.currency),
          ) / 100
        ).toFixed(2),
    );
  }, [token]);

  useEffect(() => {
    const refresh = () =>
      void load().catch((e) =>
        setError(e instanceof Error ? e.message : 'Unable to open this payment link.'),
      );
    const interval = window.setInterval(refresh, 10_000);
    void refresh();
    return () => window.clearInterval(interval);
  }, [load]);

  const openStripeCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!order || !amount) return;

    const amountCents = Math.round(Number(amount) * 100);

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setError('Enter a valid amount before opening checkout.');
      return;
    }

    setOpeningCheckout(true);
    setError('');

    try {
      const session = await createPublicCheckoutSession(token, { amountCents });
      window.location.href = session.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to start Stripe checkout.');
      setOpeningCheckout(false);
    }
  };

  if (!order) return <Loading />;

  const maximumStripePaymentCents = getStripeMaximumPaymentCents(order.currency);
  const maximumPaymentCents = Math.min(order.amountDueCents, maximumStripePaymentCents);

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <p className="text-sm font-medium text-slate-500">CrossVal payment link</p>
          <h1 className="mt-2 text-3xl font-semibold">Payment for {order.customer}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge
              className={
                order.status === 'overdue'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-slate-100 text-slate-700'
              }
            >
              {order.status === 'overdue' ? 'Overdue' : 'On track'}
            </Badge>
            <p
              className={`text-sm ${order.status === 'overdue' ? 'font-medium text-red-700' : 'text-slate-500'}`}
            >
              Due {formatDate(order.dueDate)} · {getDueSummary(order.dueDate)}
            </p>
          </div>
        </header>
        <section className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Order summary</h2>
          <div className="mt-4 divide-y border-y">
            {order.lineItems.map((item, index) => (
              <div className="flex justify-between gap-4 py-4" key={`${item.description}-${index}`}>
                <div>
                  <p className="font-medium">{item.description}</p>
                  <p className="text-sm text-slate-500">
                    {item.quantity} × {formatMoney(item.unitPriceCents, order.currency)}
                  </p>
                </div>
                <p className="font-medium">{formatMoney(item.lineTotalCents, order.currency)}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-between text-lg font-semibold">
            <span>Amount due</span>
            <span>{formatMoney(order.amountDueCents, order.currency)}</span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Enter the amount in {order.currency} units. Stripe allows up to{' '}
            {formatMoney(maximumStripePaymentCents, order.currency)} per payment; larger balances
            can be paid through multiple Stripe payments.
          </p>
        </section>
        {order.amountDueCents > 0 ? (
          <section className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="font-semibold">Pay this order</h2>
            <p className="mt-1 text-sm text-slate-500">Secure payment powered by Stripe.</p>
            <form className="mt-5 space-y-4" onSubmit={openStripeCheckout}>
              <div className="space-y-2">
                <Label htmlFor="public-payment-amount">Amount</Label>
                <Input
                  id="public-payment-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={(maximumPaymentCents / 100).toFixed(2)}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              {error ? <p className="text-sm text-red-700">{error}</p> : null}
              <Button className="w-full" disabled={openingCheckout}>
                <CreditCard className="size-4" aria-hidden="true" />
                {openingCheckout ? 'Opening Stripe checkout...' : 'Pay with Stripe'}
              </Button>
            </form>
          </section>
        ) : (
          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
            This order is fully paid.
          </section>
        )}
        <section className="rounded-lg border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-5">
            <h2 className="font-semibold">Payment history</h2>
            <RefreshCw className="size-4 text-slate-400" aria-label="Refreshes automatically" />
          </div>
          {payments.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">No payments recorded yet.</div>
          ) : (
            <div className="divide-y">
              {payments.map((payment) => (
                <div className="flex justify-between gap-4 p-5" key={payment.id}>
                  <div>
                    <p className="font-medium">
                      {formatMoney(payment.amountCents, order.currency)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatDate(payment.paidAt)}
                      {payment.note ? ` · ${payment.note}` : ''}
                    </p>
                  </div>
                  <span className="text-sm text-emerald-700">Received</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <LoaderCircle className="size-6 animate-spin" />
    </main>
  );
}
