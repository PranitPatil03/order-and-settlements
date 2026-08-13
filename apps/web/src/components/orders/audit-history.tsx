'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarClock, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { authClient } from '@/lib/auth-client';
import {
  getAuditLogs,
  getOrder,
  getPayments,
  getRefunds,
  type AuditLog,
  type Order,
  type Payment,
  type Refund,
} from '@/lib/api-client';
import { formatDate, formatDateTime, formatMoney, getDueSummary } from '@/lib/format';

type TimelineEvent = {
  id: string;
  timestamp: string;
  title: string;
  subtitle: string;
  kind: 'created' | 'payment' | 'refund' | 'status';
};

export function AuditHistory({ orderId }: { orderId: string }) {
  const router = useRouter();
  const session = authClient.useSession();
  const [order, setOrder] = useState<Order | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!session.isPending && !session.data) router.replace('/login');
  }, [router, session.data, session.isPending]);
  useEffect(() => {
    if (!session.data) return;
    void Promise.all([getOrder(orderId), getAuditLogs(orderId), getPayments(orderId), getRefunds(orderId)])
      .then(([loadedOrder, loadedLogs, loadedPayments, loadedRefunds]) => {
        setOrder(loadedOrder);
        setLogs(loadedLogs);
        setPayments(loadedPayments);
        setRefunds(loadedRefunds);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Unable to load audit history.'))
      .finally(() => setLoading(false));
  }, [orderId, session.data]);
  if (session.isPending || loading)
    return (
      <main className="flex min-h-screen items-center justify-center">
        <LoaderCircle className="size-6 animate-spin" />
      </main>
    );
  return (
    <main className="min-h-screen bg-background text-foreground">
      <AppHeader userName={session.data?.user.name} />
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8 lg:px-8">
        <Button variant="outline" onClick={() => router.push(`/orders/${orderId}`)}>
          <ArrowLeft className="size-4" /> Back to order
        </Button>
        <section className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Order lifecycle</p>
              <h1 className="mt-2 text-3xl font-semibold">{order?.customer}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Created {order ? formatDateTime(order.createdAt) : ''} · Due {order ? formatDate(order.dueDate) : ''} · {order ? getDueSummary(order.dueDate) : ''}
              </p>
            </div>
            {order ? <Badge className={order.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'}>{order.status}</Badge> : null}
          </div>
          {order ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MetaCard label="Total" value={formatMoney(order.totalCents, order.currency)} />
              <MetaCard label="Paid" value={formatMoney(order.grossPaidCents, order.currency)} />
              <MetaCard label="Refunded" value={formatMoney(order.refundedTotalCents, order.currency)} />
            </div>
          ) : null}
        </section>
        {error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : (
          <section className="rounded-lg border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="font-semibold">Lifecycle timeline</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Created, payments, refunds, and status changes in timestamp order.
                </p>
              </div>
              <CalendarClock className="size-5 text-muted-foreground" aria-hidden="true" />
            </div>
            {buildTimeline(order, logs, payments, refunds).length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">No lifecycle events recorded.</p>
            ) : (
              <div className="divide-y">
                {buildTimeline(order, logs, payments, refunds).map((event) => (
                  <div className="flex flex-col gap-2 p-5 sm:flex-row sm:items-start sm:justify-between" key={event.id}>
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{event.subtitle}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{formatDateTime(event.timestamp)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function buildTimeline(
  order: Order | null,
  logs: AuditLog[],
  payments: Payment[],
  refunds: Refund[],
) {
  if (!order) return [] as TimelineEvent[];

  const events: TimelineEvent[] = [
    {
      id: `created-${order.id}`,
      timestamp: order.createdAt,
      title: 'Order created',
      subtitle: `Customer ${order.customer} · ${order.lineItems.length} line item${order.lineItems.length === 1 ? '' : 's'} · total ${formatMoney(order.totalCents, order.currency)}`,
      kind: 'created',
    },
    ...payments.map<TimelineEvent>((payment) => ({
      id: `payment-${payment.id}`,
      timestamp: payment.paidAt,
      title: 'Payment received',
      subtitle: `${formatMoney(payment.amountCents, order.currency)}${payment.note ? ` · ${payment.note}` : ''}`,
      kind: 'payment',
    })),
    ...refunds.map<TimelineEvent>((refund) => ({
      id: `refund-${refund.id}`,
      timestamp: refund.refundedAt,
      title: 'Refund recorded',
      subtitle: `${formatMoney(refund.amountCents, order.currency)}${refund.note ? ` · ${refund.note}` : ''}`,
      kind: 'refund',
    })),
    ...logs.map<TimelineEvent>((log) => ({
      id: `status-${log.id}`,
      timestamp: log.occurredAt,
      title: `Status changed: ${log.fromStatus ?? 'created'} -> ${log.toStatus}`,
      subtitle: 'Order status audit entry',
      kind: 'status',
    })),
  ];

  return events.sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}
