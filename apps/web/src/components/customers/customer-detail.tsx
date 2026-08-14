'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Mail, Pencil, Save, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import {
  getCustomer,
  getOrders,
  updateCustomer,
  type Customer,
  type Order,
} from '@/lib/api-client';
import { formatDate, formatMoney, getDueSummary } from '@/lib/format';

export function CustomerDetail({ customerId }: { customerId: string }) {
  const router = useRouter();
  const session = authClient.useSession();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', companyName: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session.isPending && !session.data) router.replace('/login');
  }, [router, session.data, session.isPending]);

  useEffect(() => {
    if (!session.data) return;
    void Promise.all([getCustomer(customerId), getOrders({ customerId, limit: 100 })])
      .then(([loadedCustomer, loadedOrders]) => {
        setCustomer(loadedCustomer);
        setOrders(loadedOrders.items);
        setForm({
          name: loadedCustomer.name,
          email: loadedCustomer.email,
          phone: loadedCustomer.phone ?? '',
          companyName: loadedCustomer.companyName ?? '',
        });
      })
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : 'Unable to load customer.'),
      );
  }, [customerId, session.data]);

  const save = async () => {
    try {
      const updated = await updateCustomer(customerId, form);
      setCustomer(updated);
      setEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update customer.');
    }
  };

  if (session.isPending || !customer) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Loading customer...
      </main>
    );
  }

  const totalSpent = orders.reduce((sum, order) => sum + order.grossPaidCents, 0);

  return (
    <AppShell userName={session.data?.user.name} userEmail={session.data?.user.email}>
      <div className="mx-auto max-w-[1240px] space-y-7">
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => router.push('/customers')}>
            <ArrowLeft className="size-4" /> Customers
          </Button>
          <Button variant="outline" onClick={() => setEditing((value) => !value)}>
            <Pencil className="size-4" /> {editing ? 'Cancel edit' : 'Edit customer'}
          </Button>
        </div>
        <section className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <img
            className="size-16 rounded-full bg-[#dff2e7]"
            src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(customer.name)}`}
            alt=""
          />
          <div>
            <p className="text-sm font-semibold text-[#0b6b45]">Customer profile</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{customer.name}</h1>
            <p className="mt-1 text-sm text-slate-500">{customer.email}</p>
          </div>
        </section>
        <section className="grid gap-4 sm:grid-cols-3">
          <Metric icon={<ShoppingBag />} label="Orders" value={String(orders.length)} />
          <Metric icon={<Mail />} label="Lifetime spent" value={formatMoney(totalSpent)} />
          <Metric
            icon={<CalendarDays />}
            label="Last order"
            value={orders[0] ? formatDate(orders[0].createdAt) : '—'}
          />
        </section>
        {editing ? (
          <section className="rounded-2xl border border-slate-300 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              {(['name', 'email', 'phone', 'companyName'] as const).map((field) => (
                <div className="space-y-2" key={field}>
                  <Label htmlFor={field}>
                    {field === 'companyName'
                      ? 'Company name'
                      : field.charAt(0).toUpperCase() + field.slice(1)}
                  </Label>
                  <Input
                    id={field}
                    value={form[field]}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, [field]: event.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
            <Button className="mt-5" onClick={save}>
              <Save className="size-4" /> Save changes
            </Button>
          </section>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <section className="overflow-hidden rounded-2xl border border-slate-300">
          <div className="border-b border-slate-300 p-5">
            <h2 className="text-lg font-semibold">All orders</h2>
            <p className="mt-1 text-sm text-slate-500">
              Every order associated with this customer.
            </p>
          </div>
          {orders.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">No orders found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-[#f7faf8] text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Order</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Due date</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map((order) => (
                    <tr className="hover:bg-[#fbfdfb]" key={order.id}>
                      <td className="px-5 py-4">
                        <a
                          className="font-semibold text-[#0b6b45] hover:underline"
                          href={`/orders/${order.id}`}
                        >
                          #{order.id.slice(0, 8)}
                        </a>
                      </td>
                      <td className="px-5 py-4">{formatDate(order.createdAt)}</td>
                      <td className="px-5 py-4">{formatMoney(order.totalCents, order.currency)}</td>
                      <td className="px-5 py-4">
                        {formatDate(order.dueDate)}
                        <span className="ml-2 text-xs text-slate-500">
                          {getDueSummary(order.dueDate)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <Badge>{order.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-300 p-5">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </div>
  );
}
