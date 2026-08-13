'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, CircleDollarSign, Copy, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { AppHeader } from '@/components/layout/app-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import {
  createPaymentLink,
  getOrder,
  getPayments,
  type Order,
  type Payment,
} from '@/lib/api-client';
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
  const [paymentLink, setPaymentLink] = useState('');
  const [isCreatingLink, setIsCreatingLink] = useState(false);

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

  const generatePaymentLink = async () => {
    if (!order) return;
    setIsCreatingLink(true);
    setErrorMessage('');
    try {
      const result = await createPaymentLink(order.id);
      const display = `${result.url}\nAccess code: ${result.accessCode}`;
      setPaymentLink(display);
      await navigator.clipboard?.writeText(display);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create payment link.');
    } finally {
      setIsCreatingLink(false);
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" onClick={() => router.push('/orders')}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to orders
          </Button>
          <Button variant="outline" onClick={generatePaymentLink} disabled={isCreatingLink}>
            <Copy className="size-4" aria-hidden="true" />
            {isCreatingLink ? 'Creating link...' : 'Share customer payment link'}
          </Button>
        </div>
        {paymentLink ? (
          <section className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
            <p className="font-medium">Customer link copied</p>
            <p className="mt-1 break-all text-sky-800">{paymentLink}</p>
            <p className="mt-2 text-sky-700">
              Share both the link and access code with the customer. The order owner cannot record
              payments from this screen.
            </p>
          </section>
        ) : null}
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
        <div className="grid gap-6">
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
        </div>
        <section className="rounded-lg border bg-white shadow-sm">
          <div className="border-b p-5">
            <h2 className="font-semibold">Customer payment history</h2>
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
