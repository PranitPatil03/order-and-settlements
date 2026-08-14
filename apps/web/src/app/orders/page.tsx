'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CircleDollarSign, Download, LoaderCircle, Plus } from 'lucide-react';

import { AppHeader } from '@/components/layout/app-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { downloadOrdersCsv, getOrders, type Order, type OrderStatus } from '@/lib/api-client';
import { formatDate, formatMoney, getDueSummary } from '@/lib/format';

const statusStyles: Record<OrderStatus, string> = {
  pending: 'bg-slate-100 text-slate-700',
  partially_paid: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-800',
  overdue: 'bg-red-100 text-red-800',
};

const statusLabels: Record<OrderStatus, string> = {
  pending: 'Pending',
  partially_paid: 'Partially paid',
  paid: 'Paid',
  overdue: 'Overdue',
};

export default function OrdersPage() {
  const router = useRouter();
  const session = authClient.useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!session.isPending && !session.data) router.replace('/login');
  }, [router, session.data, session.isPending]);

  useEffect(() => {
    if (!session.data) return;

    const loadOrders = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        setOrders(await getOrders());
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load orders.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadOrders();
  }, [session.data]);

  const filteredOrders = useMemo(
    () => (status === 'all' ? orders : orders.filter((order) => order.status === status)),
    [orders, status],
  );
  const summary = useMemo(
    () => ({
      outstanding: orders.reduce((sum, order) => sum + order.amountDueCents, 0),
      collected: orders.reduce((sum, order) => sum + order.grossPaidCents, 0),
    }),
    [orders],
  );

  const exportCsv = async () => {
    setIsExporting(true);
    try {
      await downloadOrdersCsv();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to export orders.');
    } finally {
      setIsExporting(false);
    }
  };

  if (session.isPending || (!session.data && !errorMessage)) {
    return <LoadingScreen />;
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <AppHeader userName={session.data?.user.name} />
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 lg:px-8">
        <section className="relative overflow-hidden rounded-2xl border bg-white px-6 py-7 shadow-sm">
          <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
          <div className="absolute -bottom-16 left-1/3 h-36 w-36 rounded-full bg-cyan-400/10 blur-2xl" />
          <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Overview</p>
              <h1 className="mt-2 text-3xl font-semibold">Orders dashboard</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Track totals, collections, and customer payment progress.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={exportCsv} disabled={isExporting}>
                <Download className="size-4" aria-hidden="true" />
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </Button>
              <Button onClick={() => router.push('/orders/new')}>
                <Plus className="size-4" aria-hidden="true" />
                Create order
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3" aria-label="Order summary">
          <SummaryCard label="Total orders" value={String(orders.length)} helper="All orders" />
          <SummaryCard
            label="Outstanding"
            value={formatMoney(summary.outstanding)}
            helper="Amount due"
          />
          <SummaryCard
            label="Collected"
            value={formatMoney(summary.collected)}
            helper="Gross payments"
          />
        </section>

        <section className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Orders</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Review current settlement status and balances.
              </p>
            </div>
            <select
              className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              value={status}
              onChange={(event) => setStatus(event.target.value as OrderStatus | 'all')}
              aria-label="Filter orders by status"
            >
              <option value="all">All statuses</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {errorMessage ? (
            <p className="m-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}
          {isLoading ? (
            <LoadingRows />
          ) : filteredOrders.length === 0 ? (
            <EmptyOrders />
          ) : (
            <OrderTable orders={filteredOrders} />
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function OrderTable({ orders }: { orders: Order[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-5 py-3 font-medium">Customer</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium">Total</th>
            <th className="px-5 py-3 font-medium">Paid</th>
            <th className="px-5 py-3 font-medium">Due</th>
            <th className="px-5 py-3 font-medium">Due date</th>
            <th />
          </tr>
        </thead>
        <tbody className="divide-y">
          {orders.map((order) => (
            <tr className="hover:bg-slate-50" key={order.id}>
              <td className="px-5 py-4 font-medium">{order.customer}</td>
              <td className="px-5 py-4">
                <Badge className={statusStyles[order.status]}>{statusLabels[order.status]}</Badge>
              </td>
              <td className="px-5 py-4">{formatMoney(order.totalCents, order.currency)}</td>
              <td className="px-5 py-4">{formatMoney(order.grossPaidCents, order.currency)}</td>
              <td className="px-5 py-4 font-medium">
                {formatMoney(order.amountDueCents, order.currency)}
              </td>
              <td
                className={`px-5 py-4 ${order.status === 'overdue' ? 'font-medium text-red-700' : 'text-muted-foreground'}`}
              >
                <div>{formatDate(order.dueDate)}</div>
                {order.status === 'partially_paid' ? (
                  <div className="text-xs">{getDueSummary(order.dueDate)}</div>
                ) : null}
              </td>
              <td className="px-5 py-4 text-right">
                <Link
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  href={`/orders/${order.id}`}
                >
                  View <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyOrders() {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <CircleDollarSign className="size-6" aria-hidden="true" />
      </div>
      <h3 className="mt-4 font-medium">No orders found</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Create an order to start tracking payments and balances.
      </p>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3 p-5">
      {[1, 2, 3].map((item) => (
        <div className="h-12 animate-pulse rounded-md bg-muted" key={item} />
      ))}
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
