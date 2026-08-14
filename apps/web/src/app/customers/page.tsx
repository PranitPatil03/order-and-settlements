'use client';

import { useEffect, useState } from 'react';
import { Building2, Mail, Phone, Plus, Search, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { createCustomer, getCustomersPage, type Customer, type Pagination } from '@/lib/api-client';

export default function CustomersPage() {
  const router = useRouter();
  const session = authClient.useSession();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    billingAddress: '',
    shippingAddress: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session.isPending && !session.data) router.replace('/login');
  }, [router, session.data, session.isPending]);

  useEffect(() => {
    if (!session.data) return;

    const loadCustomers = async () => {
      setLoading(true);
      try {
        const response = await getCustomersPage({ page, limit: pagination.limit, q: search });
        setCustomers(response.items);
        setPagination(response.pagination);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load customers.');
      } finally {
        setLoading(false);
      }
    };

    void loadCustomers();
  }, [page, pagination.limit, search, session.data]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const created = await createCustomer({
        name: form.name,
        companyName: form.companyName,
        email: form.email,
        phone: form.phone,
        billingAddress: form.billingAddress,
        shippingAddress: form.shippingAddress,
        notes: form.notes,
      });
      setCustomers((current) => [created, ...current].slice(0, pagination.limit));
      setPagination((current) => ({ ...current, total: current.total + 1 }));
      setForm({
        name: '',
        companyName: '',
        email: '',
        phone: '',
        billingAddress: '',
        shippingAddress: '',
        notes: '',
      });
      setShowForm(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create customer.');
    } finally {
      setSubmitting(false);
    }
  };

  if (session.isPending || (!session.data && !error)) {
    return <LoadingScreen />;
  }

  return (
    <AppShell userName={session.data?.user.name} userEmail={session.data?.user.email}>
      <div className="mx-auto max-w-[1380px] space-y-7">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Customers</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage reusable customers and use them during order creation.
            </p>
          </div>
          <Button onClick={() => setShowForm((current) => !current)}>
            <Plus className="size-4" aria-hidden="true" />
            {showForm ? 'Hide form' : 'New customer'}
          </Button>
        </section>

        {showForm ? (
          <section className="p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center text-primary">
                <UserRound className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Create customer</h2>
                <p className="text-sm text-muted-foreground">
                  Store contact, company, and billing details.
                </p>
              </div>
            </div>

            <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="name">Customer name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Pranit Patil"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company name</Label>
                <Input
                  id="companyName"
                  value={form.companyName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, companyName: event.target.value }))
                  }
                  placeholder="CrossVal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="hello@company.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, phone: event.target.value }))
                  }
                  placeholder="+91 9876543210"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="billingAddress">Billing address</Label>
                <Input
                  id="billingAddress"
                  value={form.billingAddress}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, billingAddress: event.target.value }))
                  }
                  placeholder="Street, city, state, country"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="shippingAddress">Shipping address</Label>
                <Input
                  id="shippingAddress"
                  value={form.shippingAddress}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, shippingAddress: event.target.value }))
                  }
                  placeholder="Shipping address if different"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  className="flex min-h-24 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                  placeholder="Preferred payment terms, special instructions, or relationship notes"
                />
              </div>

              {error ? (
                <div className="md:col-span-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="md:col-span-2 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Save customer'}
                </Button>
              </div>
            </form>
          </section>
        ) : null}

        <section className="flex items-center justify-between gap-4 p-4">
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              className="h-11 pl-9"
              placeholder="Search customers by name, email, or company"
              aria-label="Search customers"
            />
          </div>
        </section>

        <section className="overflow-hidden">
          {loading ? (
            <div className="mt-2 flex items-center justify-center py-2 text-sm text-muted-foreground">
              Loading customers...
            </div>
          ) : customers.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed bg-slate-50 px-4 py-10 text-center text-sm text-muted-foreground">
              No customers found. Create one to start creating orders faster.
            </div>
          ) : (
            <CustomerTable customers={customers} />
          )}
          {!loading && pagination.totalPages > 1 ? (
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

function CustomerTable({ customers }: { customers: Customer[] }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-[#f7faf8] text-xs font-semibold text-slate-500">
          <tr>
            <th className="px-5 py-3">Customer</th>
            <th className="px-5 py-3">Company</th>
            <th className="px-5 py-3">Contact</th>
            <th className="px-5 py-3">Created</th>
            <th className="px-5 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {customers.map((customer) => (
            <tr className="transition hover:bg-[#fbfdfb]" key={customer.id}>
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <img
                    className="size-9 rounded-full bg-[#dff2e7] object-cover"
                    src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(customer.name)}`}
                    alt=""
                  />
                  <div>
                    <Link
                      className="font-semibold text-slate-900 hover:text-[#0b6b45] hover:underline"
                      href={`/customers/${customer.id}`}
                    >
                      {customer.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Customer #{customer.id.slice(0, 8)}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4 text-slate-600">
                {customer.companyName ? (
                  <span className="inline-flex items-center gap-2">
                    <Building2 className="size-4" />
                    {customer.companyName}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-5 py-4 text-slate-600">
                <div className="space-y-1">
                  <p className="inline-flex items-center gap-2">
                    <Mail className="size-4" />
                    {customer.email}
                  </p>
                  {customer.phone ? (
                    <p className="inline-flex items-center gap-2 text-xs">
                      <Phone className="size-3.5" />
                      {customer.phone}
                    </p>
                  ) : null}
                </div>
              </td>
              <td className="px-5 py-4 text-slate-600">
                {new Date(customer.createdAt).toLocaleDateString()}
              </td>
              <td className="px-5 py-4 text-right">
                <Link
                  href={`/customers/${customer.id}`}
                  className="font-semibold text-[#0b6b45] hover:underline"
                >
                  Edit customer
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
    <div className="mt-4 flex items-center justify-between border-t border-[#edf2ee] pt-4 text-sm">
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

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Loading your dashboard...
      </div>
    </main>
  );
}
