'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Building2, Mail, Phone, Plus, Search, UserRound, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { createCustomer, getCustomers, type Customer } from '@/lib/api-client';

export default function CustomersPage() {
  const router = useRouter();
  const session = authClient.useSession();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
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
        const items = await getCustomers();
        setCustomers(items);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load customers.');
      } finally {
        setLoading(false);
      }
    };

    void loadCustomers();
  }, [session.data]);

  const filteredCustomers = customers.filter((customer) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [customer.name, customer.email, customer.companyName ?? '', customer.phone ?? '']
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

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
      setCustomers((current) => [created, ...current]);
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
    <main className="min-h-screen bg-background text-foreground">
      <AppHeader userName={session.data?.user.name} />
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 lg:px-8">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Directory</p>
            <h1 className="mt-2 text-3xl font-semibold">Customers</h1>
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
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UserRound className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Create customer</h2>
                <p className="text-sm text-muted-foreground">Store contact, company, and billing details.</p>
              </div>
            </div>

            <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="name">Customer name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Pranit Patil"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company name</Label>
                <Input
                  id="companyName"
                  value={form.companyName}
                  onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))}
                  placeholder="CrossVal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="hello@company.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="+91 9876543210"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="billingAddress">Billing address</Label>
                <Input
                  id="billingAddress"
                  value={form.billingAddress}
                  onChange={(event) => setForm((current) => ({ ...current, billingAddress: event.target.value }))}
                  placeholder="Street, city, state, country"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="shippingAddress">Shipping address</Label>
                <Input
                  id="shippingAddress"
                  value={form.shippingAddress}
                  onChange={(event) => setForm((current) => ({ ...current, shippingAddress: event.target.value }))}
                  placeholder="Shipping address if different"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
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

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="size-5" />
              </div>
              <div>
                <h2 className="font-semibold">Customer directory</h2>
                <p className="text-sm text-muted-foreground">{filteredCustomers.length} saved customer(s)</p>
              </div>
            </div>

            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Search customers"
              />
            </div>
          </div>

          {loading ? (
            <div className="mt-6 flex items-center justify-center py-8 text-sm text-muted-foreground">
              Loading customers...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed bg-slate-50 px-4 py-10 text-center text-sm text-muted-foreground">
              No customers found. Create one to start creating orders faster.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredCustomers.map((customer) => (
                <div className="rounded-xl border bg-slate-50 p-4" key={customer.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{customer.name}</p>
                      {customer.companyName ? (
                        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2 className="size-4" />
                          {customer.companyName}
                        </p>
                      ) : null}
                    </div>
                    <Link
                      href={`/orders/new?customerId=${customer.id}&customerName=${encodeURIComponent(customer.name)}`}
                      className="inline-flex items-center gap-1 rounded-md border bg-white px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-muted"
                    >
                      Use <ArrowRight className="size-3.5" />
                    </Link>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <Mail className="size-4" />
                      {customer.email}
                    </p>
                    {customer.phone ? (
                      <p className="flex items-center gap-2">
                        <Phone className="size-4" />
                        {customer.phone}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
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
