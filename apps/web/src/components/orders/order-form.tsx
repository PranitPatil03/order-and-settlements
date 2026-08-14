'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Plus,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppShell } from '@/components/layout/app-shell';
import { authClient } from '@/lib/auth-client';
import { createCustomer, createOrder, getCustomers, type Customer } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';
type FormLineItem = { description: string; quantity: string; unitPrice: string };

export function OrderForm() {
  const router = useRouter();
  const session = authClient.useSession();
  const searchParams = useSearchParams();
  const queryCustomerId = searchParams.get('customerId');
  const queryCustomerName = searchParams.get('customerName');
  const [customer, setCustomer] = useState(queryCustomerName ?? '');
  const [customerId, setCustomerId] = useState(queryCustomerId ?? '');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerOptions, setCustomerOptions] = useState<Customer[]>([]);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [customerActionError, setCustomerActionError] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [dueDate, setDueDate] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [lineItems, setLineItems] = useState<FormLineItem[]>([
    { description: '', quantity: '1', unitPrice: '' },
  ]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const items = await getCustomers();
        setCustomerOptions(items);
      } catch {
        setCustomerOptions([]);
      }
    };

    void loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();
    if (!query) return customerOptions;
    return customerOptions.filter((item) =>
      [item.name, item.email, item.companyName ?? '', item.phone ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [customerOptions, customerSearch]);

  const summary = useMemo(() => {
    const subtotal = lineItems.reduce(
      (total, item) => total + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
      0,
    );
    return {
      subtotal,
      items: lineItems.reduce((total, item) => total + (Number(item.quantity) || 0), 0),
    };
  }, [lineItems]);

  const createQuickCustomer = async () => {
    const name = newCustomerName.trim();
    const email = newCustomerEmail.trim();

    if (!name || !email) {
      setCustomerActionError('Customer name and email are required.');
      return;
    }

    try {
      setCustomerActionError('');
      const created = await createCustomer({ name, email });
      setCustomerOptions((current) => [created, ...current]);
      setCustomer(created.name);
      setCustomerId(created.id);
      setCustomerSearch('');
      setIsCreatingCustomer(false);
      setNewCustomerName('');
      setNewCustomerEmail('');
    } catch (error) {
      setCustomerActionError(error instanceof Error ? error.message : 'Unable to create customer.');
    }
  };

  const updateItem = (index: number, field: keyof FormLineItem, value: string) => {
    setLineItems((items) =>
      items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    if (!customerId) {
      setErrorMessage('Search for and select an existing customer before creating the order.');
      return;
    }
    setIsSubmitting(true);
    try {
      const order = await createOrder({
        customerId: customerId || undefined,
        customer: customerId ? undefined : customer.trim(),
        currency,
        dueDate,
        taxRateBps: Math.round(Number(taxRate) * 100),
        lineItems: lineItems.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPriceCents: Math.round(Number(item.unitPrice) * 100),
        })),
      });
      router.push(`/orders/${order.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (session.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Loading workspace...
      </div>
    );
  }

  return (
    <AppShell userName={session.data?.user.name} userEmail={session.data?.user.email}>
      <div className="-mx-5 -my-7 min-h-[calc(100vh-68px)] bg-white px-5 py-7 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
        <div className="mx-auto max-w-[1240px]">
          <div>
            <p className="text-sm font-semibold text-[#0b6b45]">Orders / New</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Create order</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Add the customer, due date, and items. Totals are calculated by the server.
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={submit}>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
              <div className="space-y-6">
                <section className="space-y-5 rounded-2xl border border-slate-300 bg-white p-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="customer">Customer</Label>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCreatingCustomer((current) => !current);
                          setCustomerActionError('');
                        }}
                      >
                        <Plus className="size-4" aria-hidden="true" />
                        {isCreatingCustomer ? 'Close' : 'New customer'}
                      </Button>
                    </div>

                    {isCreatingCustomer ? (
                      <div className="rounded-xl border border-dashed bg-slate-50 p-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="quick-customer-name">Name</Label>
                            <Input
                              id="quick-customer-name"
                              value={newCustomerName}
                              onChange={(event) => setNewCustomerName(event.target.value)}
                              placeholder="Customer name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="quick-customer-email">Email</Label>
                            <Input
                              id="quick-customer-email"
                              type="email"
                              value={newCustomerEmail}
                              onChange={(event) => setNewCustomerEmail(event.target.value)}
                              placeholder="customer@email.com"
                            />
                          </div>
                        </div>

                        {customerActionError ? (
                          <p className="mt-3 text-sm text-red-600">{customerActionError}</p>
                        ) : null}

                        <div className="mt-3 flex justify-end">
                          <Button type="button" onClick={createQuickCustomer}>
                            Save customer
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="customer"
                        value={customer}
                        onChange={(event) => {
                          setCustomer(event.target.value);
                          setCustomerId('');
                          setCustomerSearch(event.target.value);
                        }}
                        placeholder="Search customers by name or email"
                        className="pl-9"
                        required
                      />
                    </div>

                    {customerSearch && !customerId ? (
                      <div className="mt-3 rounded-xl border border-slate-300 bg-slate-50 p-2">
                        <div className="max-h-52 space-y-2 overflow-auto">
                          {filteredCustomers.length === 0 ? (
                            <p className="px-2 py-2 text-sm text-muted-foreground">
                              No customer found. Use “New customer” above to save one with just a
                              name and email.
                            </p>
                          ) : (
                            filteredCustomers.map((item) => (
                              <button
                                type="button"
                                key={item.id}
                                onClick={() => {
                                  setCustomer(item.name);
                                  setCustomerId(item.id);
                                  setCustomerSearch('');
                                }}
                                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                                  item.id === customerId
                                    ? 'border-primary bg-primary/5'
                                    : 'border-transparent bg-white hover:border-border'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="size-8 overflow-hidden rounded-lg bg-[#dff2e7]">
                                    <img
                                      className="size-full"
                                      src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(item.name)}`}
                                      alt=""
                                    />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">{item.email}</p>
                                  </div>
                                </div>
                                {item.id === customerId ? (
                                  <Check className="size-4 text-primary" />
                                ) : null}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <div className="relative">
                      <select
                        id="currency"
                        value={currency}
                        onChange={(event) => setCurrency(event.target.value)}
                        className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="USD">USD</option>
                        <option value="INR">INR</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due-date">Due date</Label>
                    <Input
                      id="due-date"
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax-rate">Tax rate (%)</Label>
                    <Input
                      id="tax-rate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={taxRate}
                      onChange={(event) => setTaxRate(event.target.value)}
                    />
                  </div>
                </section>
                <section className="rounded-2xl border border-slate-300 bg-white p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold">Line items</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Prices are entered in your selected currency.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setLineItems((items) => [
                          ...items,
                          { description: '', quantity: '1', unitPrice: '' },
                        ])
                      }
                    >
                      <Plus className="size-4" aria-hidden="true" />
                      Add item
                    </Button>
                  </div>
                  <div className="mt-5 space-y-4">
                    {lineItems.map((item, index) => (
                      <div
                        className="grid gap-3 rounded-md border bg-slate-50 p-4 sm:grid-cols-[1fr_100px_140px_auto] sm:items-end"
                        key={index}
                      >
                        <div className="space-y-2">
                          <Label htmlFor={`description-${index}`}>Description</Label>
                          <Input
                            id={`description-${index}`}
                            value={item.description}
                            onChange={(event) =>
                              updateItem(index, 'description', event.target.value)
                            }
                            placeholder="Implementation"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`quantity-${index}`}>Quantity</Label>
                          <Input
                            id={`quantity-${index}`}
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`price-${index}`}>Unit price</Label>
                          <Input
                            id={`price-${index}`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(event) => updateItem(index, 'unitPrice', event.target.value)}
                            placeholder="500.00"
                            required
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="px-3"
                          aria-label="Remove line item"
                          disabled={lineItems.length === 1}
                          onClick={() =>
                            setLineItems((items) =>
                              items.filter((_, itemIndex) => itemIndex !== index),
                            )
                          }
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
                <CustomerCard customer={customerOptions.find((item) => item.id === customerId)} />
                <OrderSummary
                  currency={currency}
                  dueDate={dueDate}
                  itemCount={summary.items}
                  subtotal={summary.subtotal}
                  taxRate={Number(taxRate) || 0}
                />
              </div>
            </div>
            {errorMessage ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create order'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

function OrderSummary({
  currency,
  dueDate,
  itemCount,
  subtotal,
  taxRate,
}: {
  currency: string;
  dueDate: string;
  itemCount: number;
  subtotal: number;
  taxRate: number;
}) {
  const tax = Math.round(subtotal * taxRate) / 100;
  const total = subtotal + tax;
  return (
    <aside className="h-fit rounded-2xl border border-slate-300 bg-white p-6">
      <div className="flex items-center gap-3 border-b border-slate-300 pb-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-[#dff2e7] text-[#0b6b45]">
          <CircleDollarSign className="size-5" />
        </div>
        <div>
          <h2 className="font-semibold">Order summary</h2>
          <p className="text-sm text-slate-500">Review before creating</p>
        </div>
      </div>
      <div className="space-y-4 py-5 text-sm">
        <div className="flex items-center justify-between text-slate-600">
          <span>Line items</span>
          <span className="font-medium text-slate-900">{itemCount}</span>
        </div>
        <div className="flex items-center justify-between text-slate-600">
          <span>Subtotal</span>
          <span className="font-medium text-slate-900">
            {formatMoney(subtotal * 100, currency)}
          </span>
        </div>
        <div className="flex items-center justify-between text-slate-600">
          <span>Tax ({taxRate.toFixed(2)}%)</span>
          <span className="font-medium text-slate-900">{formatMoney(tax * 100, currency)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-slate-300 pt-4 text-base font-semibold">
          <span>Total due</span>
          <span>{formatMoney(total * 100, currency)}</span>
        </div>
      </div>
      <div className="flex items-start gap-3 border-t border-slate-300 pt-5 text-sm text-slate-600">
        <CalendarDays className="mt-0.5 size-4 shrink-0 text-[#0b6b45]" />
        <span>{dueDate ? `Payment due ${dueDate}` : 'Choose a due date'}</span>
      </div>
    </aside>
  );
}

function CustomerCard({ customer }: { customer?: Customer }) {
  return (
    <section className="rounded-2xl border border-slate-300 bg-white p-6">
      <div className="flex items-center justify-between border-b border-slate-300 pb-4">
        <h2 className="font-semibold">Customer</h2>
        <UserRound className="size-5 text-slate-400" />
      </div>
      {customer ? (
        <div className="mt-5 flex items-center gap-3">
          <img
            className="size-11 rounded-full bg-[#dff2e7]"
            src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(customer.name)}`}
            alt=""
          />
          <div className="min-w-0">
            <p className="font-semibold">{customer.name}</p>
            <p className="truncate text-sm text-slate-500">{customer.email}</p>
            {customer.companyName ? (
              <p className="text-xs text-slate-500">{customer.companyName}</p>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mt-5 text-sm text-slate-500">
          Search and select a customer to see their details here.
        </p>
      )}
    </section>
  );
}
