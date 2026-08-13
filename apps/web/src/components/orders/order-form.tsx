'use client';

import { FormEvent, useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createOrder } from '@/lib/api-client';
type FormLineItem = { description: string; quantity: string; unitPrice: string };

export function OrderForm() {
  const router = useRouter();
  const [customer, setCustomer] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [lineItems, setLineItems] = useState<FormLineItem[]>([
    { description: '', quantity: '1', unitPrice: '' },
  ]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateItem = (index: number, field: keyof FormLineItem, value: string) => {
    setLineItems((items) =>
      items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const order = await createOrder({
        customer,
        dueDate,
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

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-8 lg:px-8">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </Button>
        <div className="mt-8">
          <p className="text-sm font-medium text-muted-foreground">Orders</p>
          <h1 className="mt-2 text-3xl font-semibold">Create order</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Add the customer, due date, and items. Totals are calculated by the server.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={submit}>
          <section className="space-y-5 rounded-lg border bg-white p-6 shadow-sm">
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Input
                id="customer"
                value={customer}
                onChange={(event) => setCustomer(event.target.value)}
                placeholder="Acme Corporation"
                required
              />
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
          </section>
          <section className="rounded-lg border bg-white p-6 shadow-sm">
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
                      onChange={(event) => updateItem(index, 'description', event.target.value)}
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
                      setLineItems((items) => items.filter((_, itemIndex) => itemIndex !== index))
                    }
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          </section>
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
    </main>
  );
}
