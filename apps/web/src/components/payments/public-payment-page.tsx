'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { CheckCircle2, LoaderCircle, RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getPublicOrder, payPublicOrder, type Order, type Payment } from '@/lib/api-client';
import { formatDate, formatMoney, getDueSummary } from '@/lib/format';

export function PublicPaymentPage({ token }: { token: string }) {
  const [accessCode, setAccessCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(
    async (code: string) => {
      const result = await getPublicOrder(token, code);
      setOrder(result.order);
      setPayments(result.payments);
    },
    [token],
  );

  const openWithCode = useCallback(
    async (code: string) => {
      const normalized = code.trim().toUpperCase();

      if (!normalized) return;

      await load(normalized);
      setCodeInput(normalized);
      setAccessCode(normalized);
    },
    [load],
  );

  useEffect(() => {
    if (!accessCode) return;
    const refresh = () => void load(accessCode).catch(() => undefined);
    const interval = window.setInterval(refresh, 10_000);
    return () => window.clearInterval(interval);
  }, [accessCode, load]);

  useEffect(() => {
    const fragmentCode = window.location.hash.slice(1).trim();
    if (!fragmentCode || accessCode) return;
    void openWithCode(fragmentCode).catch(() => undefined);
  }, [accessCode, openWithCode]);

  const unlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await openWithCode(codeInput);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to open this payment link.');
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!order) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await payPublicOrder(token, accessCode, {
        amountCents: Math.round(Number(amount) * 100),
        note: note.trim() || undefined,
      });
      setOrder(result.order);
      const refreshed = await getPublicOrder(token, accessCode);
      setPayments(refreshed.payments);
      setComplete(true);
      setAmount('');
      setNote('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!accessCode) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 text-slate-950">
        <section className="w-full max-w-md rounded-lg border bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">CrossVal payment link</p>
          <h1 className="mt-2 text-2xl font-semibold">Opening payment link</h1>
          <p className="mt-2 text-sm text-slate-500">
            If the code is not included in the link, enter it below.
          </p>
          <form className="mt-6 space-y-4" onSubmit={unlock}>
            <div className="space-y-2">
              <Label htmlFor="payment-code">Access code</Label>
              <Input
                id="payment-code"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                maxLength={10}
                autoComplete="one-time-code"
                required
              />
            </div>
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            <Button className="w-full" disabled={loading}>
              {loading ? 'Opening...' : 'View order'}
            </Button>
          </form>
        </section>
      </main>
    );
  }

  if (!order) return <Loading />;

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
          <p className="mt-2 text-sm text-slate-500">Enter the amount in {order.currency} units.</p>
        </section>
        {complete ? (
          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
            <CheckCircle2 className="size-6" />
            <h2 className="mt-3 font-semibold">Payment recorded</h2>
            <p className="mt-1 text-sm">The order balance and payment history have been updated.</p>
          </section>
        ) : null}
        {order.amountDueCents > 0 ? (
          <section className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="font-semibold">Pay this order</h2>
            <p className="mt-1 text-sm text-slate-500">You can make a full or partial payment.</p>
            <form className="mt-5 space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="public-payment-amount">Amount</Label>
                <Input
                  id="public-payment-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={(order.amountDueCents / 100).toFixed(2)}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="public-payment-note">Note</Label>
                <Textarea
                  id="public-payment-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note for the payment"
                  maxLength={1000}
                />
              </div>
              {error ? <p className="text-sm text-red-700">{error}</p> : null}
              <Button className="w-full" disabled={submitting}>
                {submitting ? 'Processing...' : 'Pay order'}
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
