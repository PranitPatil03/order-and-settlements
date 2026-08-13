'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, CircleDollarSign, LoaderCircle, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { AppHeader } from '@/components/layout/app-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { authClient } from '@/lib/auth-client';
import { getOrder, getPayments, recordPayment, type Order, type Payment } from '@/lib/api-client';
import { formatDate, formatMoney } from '@/lib/format';

const statusStyles = {
  pending: 'bg-slate-100 text-slate-700',
  partially_paid: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-800',
  overdue: 'bg-red-100 text-red-800',
};

const statusLabels = {
  pending: 'Pending',
  partially_paid: 'Partially paid',
  paid: 'Paid',
  overdue: 'Overdue',
};

export function OrderDetail({ orderId }: { orderId: string }) {
  const router = useRouter();
  const session = authClient.useSession();
  const [order, setOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!session.isPending && !session.data) router.replace('/login');
  }, [router, session.data, session.isPending]);

  useEffect(() => {
    if (!session.data) return;
    const load = async () => {
      try {
        const [loadedOrder, loadedPayments] = await Promise.all([
          getOrder(orderId),
          getPayments(orderId),
        ]);
        setOrder(loadedOrder);
        setPayments(loadedPayments);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load order.');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [orderId, session.data]);

  const submitPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!order) return;
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const result = await recordPayment(order.id, {
        amountCents: Math.round(Number(amount) * 100),
        paidAt: new Date(paidAt).toISOString(),
        note: note || undefined,
      });
      setOrder(result.order);
      setPayments(await getPayments(order.id));
      setAmount('');
      setNote('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to record payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (session.isPending || isLoading) return <LoadingScreen />;
  if (!order)
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-red-700">{errorMessage || 'Order not found.'}</p>
      </main>
    );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <AppHeader userName={session.data?.user.name} />
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 lg:px-8">
        <Button variant="outline" onClick={() => router.push('/orders')}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to orders
        </Button>
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Order detail</p>
            <h1 className="mt-2 text-3xl font-semibold">{order.customer}</h1>
            <p className="mt-2 text-sm text-muted-foreground">Due {formatDate(order.dueDate)}</p>
          </div>
          <Badge className={statusStyles[order.status]}>{statusLabels[order.status]}</Badge>
        </section>
        <section className="grid gap-4 sm:grid-cols-4">
          <Summary label="Order total" value={formatMoney(order.totalCents, order.currency)} />
          <Summary label="Gross paid" value={formatMoney(order.grossPaidCents, order.currency)} />
          <Summary label="Refunded" value={formatMoney(order.refundedTotalCents, order.currency)} />
          <Summary label="Amount due" value={formatMoney(order.amountDueCents, order.currency)} />
        </section>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-lg border bg-white shadow-sm">
            <div className="border-b p-5">
              <h2 className="font-semibold">Line items</h2>
            </div>
            <div className="divide-y">
              {order.lineItems.map((item, index) => (
                <div
                  className="flex items-center justify-between gap-4 p-5"
                  key={`${item.description}-${index}`}
                >
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.quantity} × {formatMoney(item.unitPriceCents, order.currency)}
                    </p>
                  </div>
                  <p className="font-medium">{formatMoney(item.lineTotalCents, order.currency)}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Plus className="size-4 text-primary" aria-hidden="true" />
              <h2 className="font-semibold">Record payment</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Maximum available:{' '}
              {formatMoney(Math.max(0, order.totalCents - order.grossPaidCents), order.currency)}
            </p>
            <form className="mt-5 space-y-4" onSubmit={submitPayment}>
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Amount</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-date">Payment date</Label>
                <Input
                  id="payment-date"
                  type="datetime-local"
                  value={paidAt}
                  onChange={(event) => setPaidAt(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-note">Note</Label>
                <Textarea
                  id="payment-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Optional note"
                />
              </div>
              {errorMessage ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMessage}
                </p>
              ) : null}
              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Recording...' : 'Record payment'}
              </Button>
            </form>
          </section>
        </div>
        <section className="rounded-lg border bg-white shadow-sm">
          <div className="border-b p-5">
            <h2 className="font-semibold">Payment history</h2>
          </div>
          {payments.length === 0 ? (
            <div className="flex min-h-32 items-center justify-center p-5 text-sm text-muted-foreground">
              No payments recorded.
            </div>
          ) : (
            <div className="divide-y">
              {payments.map((payment) => (
                <div
                  className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between"
                  key={payment.id}
                >
                  <div>
                    <p className="font-medium">
                      {formatMoney(payment.amountCents, order.currency)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(payment.paidAt)}
                      {payment.note ? ` · ${payment.note}` : ''}
                    </p>
                  </div>
                  <CircleDollarSign className="size-5 text-emerald-600" aria-hidden="true" />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-xl font-semibold">{value}</p>
    </div>
  );
}

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <LoaderCircle className="size-6 animate-spin text-primary" aria-label="Loading" />
    </main>
  );
}
