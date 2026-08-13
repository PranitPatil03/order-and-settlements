'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { authClient } from '@/lib/auth-client';
import { getOrder, getRefunds, recordRefund, type Order, type Refund } from '@/lib/api-client';
import { formatDate, formatMoney } from '@/lib/format';

export function RefundHistory({ orderId }: { orderId: string }) {
  const router = useRouter();
  const session = authClient.useSession();
  const [order, setOrder] = useState<Order | null>(null);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!session.isPending && !session.data) router.replace('/login');
  }, [router, session.data, session.isPending]);
  useEffect(() => {
    if (!session.data) return;
    void Promise.all([getOrder(orderId), getRefunds(orderId)])
      .then(([loadedOrder, loadedRefunds]) => {
        setOrder(loadedOrder);
        setRefunds(loadedRefunds);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Unable to load refunds.'))
      .finally(() => setLoading(false));
  }, [orderId, session.data]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!order) return;
    setSaving(true);
    setError('');
    try {
      const result = await recordRefund(order.id, {
        amountCents: Math.round(Number(amount) * 100),
        refundedAt: new Date().toISOString(),
        note: note.trim() || undefined,
      });
      setOrder(result.order);
      setRefunds(await getRefunds(order.id));
      setAmount('');
      setNote('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to record refund.');
    } finally {
      setSaving(false);
    }
  };
  if (session.isPending || loading) return <Loading />;
  return (
    <main className="min-h-screen bg-background text-foreground">
      <AppHeader userName={session.data?.user.name} />
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8 lg:px-8">
        <Button variant="outline" onClick={() => router.push(`/orders/${orderId}`)}>
          <ArrowLeft className="size-4" /> Back to order
        </Button>
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <h1 className="text-3xl font-semibold">Refunds for {order?.customer}</h1>
        {order ? (
          <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <section className="rounded-lg border bg-white p-5 shadow-sm">
              <h2 className="font-semibold">Record refund</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Available:{' '}
                {formatMoney(
                  Math.max(0, order.grossPaidCents - order.refundedTotalCents),
                  order.currency,
                )}
              </p>
              <form className="mt-5 space-y-4" onSubmit={submit}>
                <div className="space-y-2">
                  <Label htmlFor="refund-amount">Amount refunded</Label>
                  <Input
                    id="refund-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={((order.grossPaidCents - order.refundedTotalCents) / 100).toFixed(2)}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="refund-note">Note</Label>
                  <Textarea
                    id="refund-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Optional refund note"
                  />
                </div>
                <Button className="w-full" disabled={saving}>
                  {saving ? 'Recording...' : 'Record refund'}
                </Button>
              </form>
            </section>
            <section className="rounded-lg border bg-white shadow-sm">
              <div className="border-b p-5">
                <h2 className="font-semibold">Refund history</h2>
              </div>
              {refunds.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">No refunds recorded.</p>
              ) : (
                <div className="divide-y">
                  {refunds.map((refund) => (
                    <div className="flex justify-between gap-4 p-5" key={refund.id}>
                      <div>
                        <p className="font-medium">
                          {formatMoney(refund.amountCents, order.currency)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(refund.refundedAt)}
                          {refund.note ? ` · ${refund.note}` : ''}
                        </p>
                      </div>
                      <span className="text-sm text-rose-700">Refunded</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>
        ) : null}
      </div>
    </main>
  );
}
function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <LoaderCircle className="size-6 animate-spin" />
    </main>
  );
}
