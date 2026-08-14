'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDownUp, CircleDollarSign, Download, LoaderCircle, Plus, Search } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import {
  downloadOrdersCsv,
  getOrders,
  type Order,
  type OrderStatus,
  type Pagination,
} from '@/lib/api-client';
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
  const searchParams = useSearchParams();
  const workspaceView = searchParams.get('view');
  const session = authClient.useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'dueDate' | 'amountDue'>('createdAt');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
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
        const response = await getOrders({
          status: status === 'all' ? undefined : status,
          page,
          limit: pagination.limit,
          q: search,
          refunded: workspaceView === 'refunded',
        });
        setOrders(response.items);
        setPagination(response.pagination);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load orders.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadOrders();
  }, [page, pagination.limit, search, session.data, status, workspaceView]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders
      .filter(
        (order) =>
          (workspaceView !== 'refunded' || order.refundedTotalCents > 0) &&
          (!query ||
            order.customer.toLowerCase().includes(query) ||
            order.id.toLowerCase().includes(query) ||
            formatDate(order.dueDate).toLowerCase().includes(query)),
      )
      .sort((left, right) => {
        if (sortBy === 'dueDate') return left.dueDate.localeCompare(right.dueDate);
        if (sortBy === 'amountDue') return right.amountDueCents - left.amountDueCents;
        return right.createdAt.localeCompare(left.createdAt);
      });
  }, [orders, search, sortBy, workspaceView]);
  const summary = useMemo(
    () => ({
      outstanding: orders.reduce((sum, order) => sum + order.amountDueCents, 0),
      collected: orders.reduce((sum, order) => sum + order.grossPaidCents, 0),
      needsAttention: orders.filter((order) => order.status === 'overdue').length,
      refunded: orders.filter((order) => order.refundedTotalCents > 0).length,
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
    <AppShell userName={session.data?.user.name} userEmail={session.data?.user.email}>
      <div className="mx-auto max-w-[1380px] space-y-7">
        <section className="relative overflow-hidden py-2">
          {/* <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#dff2e7] blur-2xl" /> */}
          {/* <div className="absolute -bottom-16 left-1/3 h-36 w-36 rounded-full bg-[#eef7df] blur-2xl" /> */}
          <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              {/* <p className="text-sm font-semibold text-[#0b6b45]">Overview</p> */}
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                {workspaceView === 'refunded'
                  ? 'Refunded orders'
                  : workspaceView === 'audit'
                    ? 'Audit trail'
                    : 'Orders'}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Manage orders, collections, and customer payment progress.
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

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Order summary">
          <SummaryCard label="Total orders" value={String(pagination.total)} helper="All orders" />
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
          <SummaryCard
            label="Needs attention"
            value={String(summary.needsAttention)}
            helper="Overdue orders"
            accent={summary.needsAttention > 0}
          />
          <SummaryCard
            label="Refunded"
            value={String(summary.refunded)}
            helper="Orders with refunds"
          />
        </section>

        <section className="bg-[#f7faf8]">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(180px,0.65fr)_minmax(180px,0.65fr)]">
            <label className="max-w-[320px] space-y-2">
              <span className="text-xs font-semibold text-slate-600">Search orders</span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="h-11 w-full rounded-lg border border-[#dce6df] bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0b6b45] focus:ring-2 focus:ring-[#0b6b45]/15"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by customer or order ID"
                  aria-label="Search orders"
                />
              </span>
            </label>
            <label className="max-w-[320px] space-y-2">
              <span className="text-xs font-semibold text-slate-600">Sort by</span>
              <span className="relative block">
                <ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <select
                  className="h-11 w-full appearance-none rounded-lg border border-[#dce6df] bg-white pl-10 pr-3 text-sm outline-none focus:border-[#0b6b45] focus:ring-2 focus:ring-[#0b6b45]/15"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                >
                  <option value="createdAt">Newest first</option>
                  <option value="dueDate">Due date</option>
                  <option value="amountDue">Amount due</option>
                </select>
              </span>
            </label>
            <label className="max-w-[320px] space-y-2">
              <span className="text-xs font-semibold text-slate-600">Status</span>
              <select
                className="h-11 w-full rounded-lg border border-[#dce6df] bg-white px-3 text-sm outline-none focus:border-[#0b6b45] focus:ring-2 focus:ring-[#0b6b45]/15"
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
            </label>
          </div>
        </section>

        <section className="overflow-hidden rounded border border-[#dce6df] bg-white shadow-sm">
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
          {!isLoading && pagination.totalPages > 1 ? (
            <PaginationControls
              page={page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  accent = false,
}: {
  label: string;
  value: string;
  helper: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded border border-[#dce6df] bg-white p-5 shadow-[0_8px_24px_rgba(28,66,45,0.04)]">
      <p
        className={`text-xs font-semibold uppercase tracking-[0.14em] ${accent ? 'text-amber-600' : 'text-slate-400'}`}
      >
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function OrderTable({ orders }: { orders: Order[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-[#f7faf8] text-xs font-semibold text-slate-500">
          <tr>
            <th className="px-5 py-3 font-semibold">Order ID</th>
            <th className="px-5 py-3 font-semibold">Customer</th>
            <th className="px-5 py-3 font-semibold">Order total</th>
            <th className="px-5 py-3 font-semibold">Amount paid</th>
            <th className="px-5 py-3 font-semibold">Amount due</th>
            <th className="px-5 py-3 font-semibold">Due date</th>
            <th className="px-5 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {orders.map((order) => (
            <tr className="border-t border-[#edf2ee] transition hover:bg-[#fbfdfb]" key={order.id}>
              <td className="px-5 py-4">
                <Link
                  className="font-semibold text-[#0b6b45] hover:underline"
                  href={`/orders/${order.id}`}
                >
                  #{order.id.slice(0, 8)}
                </Link>
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#dff2e7] text-xs font-bold text-[#0b6b45]">
                    {order.customer
                      .split(' ')
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <div>
                    {order.customerId ? (
                      <Link
                        className="font-semibold text-slate-900 hover:text-[#0b6b45] hover:underline"
                        href={`/customers/${order.customerId}`}
                      >
                        {order.customer}
                      </Link>
                    ) : (
                      <p className="font-semibold text-slate-900">{order.customer}</p>
                    )}
                  </div>
                </div>
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
                {order.status !== 'paid' ? (
                  <div className="text-xs">{getDueSummary(order.dueDate)}</div>
                ) : null}
              </td>
              <td className="px-5 py-4">
                <Badge className={statusStyles[order.status]}>{statusLabels[order.status]}</Badge>
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
      <div className="flex size-12 items-center justify-center rounded-2xl bg-[#e4f3eb] text-[#0b6b45]">
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

function PaginationControls({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-[#edf2ee] px-5 py-4 text-sm">
      <p className="text-slate-500">
        Page <span className="font-semibold text-slate-900">{page}</span> of {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="min-h-9 px-3 text-xs"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          className="min-h-9 px-3 text-xs"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
