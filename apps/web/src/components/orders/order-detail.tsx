'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  CalendarDays,
  CircleDollarSign,
  Copy,
  CreditCard,
  LoaderCircle,
  Mail,
  UserRound,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
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
import { formatDate, formatMoney, getDueSummary } from '@/lib/format';

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
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

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
      await navigator.clipboard?.writeText(result.url);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2200);
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
    <AppShell userName={session.data?.user.name} userEmail={session.data?.user.email}>
      <div className="mx-auto max-w-[1240px] space-y-6">
        <div className="flex justify-end">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge className={statusStyles[order.status]}>{statusLabels[order.status]}</Badge>
            <Button onClick={generatePaymentLink} disabled={isCreatingLink}>
              <Copy className="size-4" aria-hidden="true" />
              {isCreatingLink ? 'Creating link...' : linkCopied ? 'Payment link copied' : 'Payment link'}
            </Button>
            <Button variant="outline" onClick={() => router.push(`/orders/${orderId}/refunds`)}>
              Refunds
            </Button>
            <Button variant="outline" onClick={() => router.push(`/orders/${orderId}/audit`)}>
              Audit
            </Button>
          </div>
        </div>
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-[#0b6b45]">Orders / Detail</p>
            <p className="mt-2 text-sm text-slate-500">
              Order #{order.id.slice(0, 8)} · {formatDate(order.createdAt)}
            </p>
            {order.customerId ? (
              <a
                href={`/customers/${order.customerId}`}
                className="mt-2 block text-3xl font-semibold hover:text-[#0b6b45] hover:underline"
              >
                {order.customer}
              </a>
            ) : (
              <h1 className="mt-2 text-3xl font-semibold">{order.customer}</h1>
            )}
            <p
              className={`mt-2 text-sm ${order.status === 'overdue' ? 'font-medium text-red-700' : 'text-muted-foreground'}`}
            >
              Due {formatDate(order.dueDate)} · {getDueSummary(order.dueDate)}
            </p>
          </div>
        </section>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Summary label="Order total" value={formatMoney(order.totalCents, order.currency)} />
          <Summary
            label={`Tax (${(order.taxRateBps / 100).toFixed(2)}%)`}
            value={formatMoney(order.taxCents, order.currency)}
          />
          <Summary label="Gross paid" value={formatMoney(order.grossPaidCents, order.currency)} />
          <Summary label="Refunded" value={formatMoney(order.refundedTotalCents, order.currency)} />
          <Summary label="Amount due" value={formatMoney(order.amountDueCents, order.currency)} />
        </section>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-300 bg-white shadow-sm">
              <div className="border-b p-5">
                <div className="flex items-center gap-3">
                  <CircleDollarSign className="size-5 text-[#0b6b45]" />
                  <h2 className="font-semibold">Order items</h2>
                </div>
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
                    <p className="font-medium">
                      {formatMoney(item.lineTotalCents, order.currency)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-2xl border border-slate-300 bg-white shadow-sm">
              <div className="border-b p-5">
                <div className="flex items-center gap-3">
                  <CreditCard className="size-5 text-[#0b6b45]" />
                  <h2 className="font-semibold">Payment</h2>
                </div>
              </div>
              <div className="space-y-3 p-5 text-sm">
                <SummaryRow
                  label="Subtotal"
                  value={formatMoney(order.subtotalCents, order.currency)}
                />
                <SummaryRow
                  label="Gross paid"
                  value={formatMoney(order.grossPaidCents, order.currency)}
                />
                <SummaryRow
                  label={`Tax (${(order.taxRateBps / 100).toFixed(2)}%)`}
                  value={formatMoney(order.taxCents, order.currency)}
                />
                <SummaryRow
                  label="Total refund"
                  value={formatMoney(order.refundedTotalCents, order.currency)}
                />
                <SummaryRow
                  label="Amount due"
                  value={formatMoney(order.amountDueCents, order.currency)}
                  strong
                />
              </div>
            </section>
            <section className="rounded-2xl border border-slate-300 bg-white shadow-sm">
              <div className="border-b p-5">
                <div className="flex items-center gap-3">
                  <Activity className="size-5 text-[#0b6b45]" />
                  <h2 className="font-semibold">Transaction details</h2>
                </div>
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
          <div className="space-y-6 lg:sticky lg:top-24">
            <section className="rounded-2xl border border-slate-300 bg-white p-5">
              <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                <UserRound className="size-5 text-[#0b6b45]" />
                <h2 className="font-semibold">Customer information</h2>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <img
                  className="size-12 rounded-full bg-[#dff2e7]"
                  src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(order.customer)}`}
                  alt=""
                />
                <div>
                  <p className="font-semibold">{order.customer}</p>
                  {order.customerId ? (
                    <a
                      className="text-sm text-[#0b6b45] hover:underline"
                      href={`/customers/${order.customerId}`}
                    >
                      View customer profile
                    </a>
                  ) : (
                    <p className="text-sm text-slate-500">Guest customer</p>
                  )}
                </div>
              </div>
              <div className="mt-5 space-y-3 border-t border-slate-200 pt-4 text-sm text-slate-600">
                <p className="flex items-center gap-2">
                  <Mail className="size-4 text-slate-400" /> Customer details available in profile
                </p>
                <p className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-slate-400" /> Due {formatDate(order.dueDate)}
                </p>
              </div>
            </section>
            <section className="rounded-2xl border border-slate-300 bg-white p-5">
              <h2 className="font-semibold">Order status</h2>
              <p className="mt-2 text-sm text-slate-500">
                {getDueSummary(order.dueDate)} · {statusLabels[order.status]}
              </p>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
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

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${strong ? 'border-t border-slate-200 pt-3 text-base font-semibold text-slate-950' : 'text-slate-600'}`}
    >
      <span>{label}</span>
      <span>{value}</span>
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
