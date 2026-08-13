'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { getAuditLogs, getOrder, type AuditLog, type Order } from '@/lib/api-client';
import { formatDate } from '@/lib/format';

export function AuditHistory({ orderId }: { orderId: string }) {
  const router = useRouter();
  const session = authClient.useSession();
  const [order, setOrder] = useState<Order | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!session.isPending && !session.data) router.replace('/login');
  }, [router, session.data, session.isPending]);
  useEffect(() => {
    if (!session.data) return;
    void Promise.all([getOrder(orderId), getAuditLogs(orderId)])
      .then(([loadedOrder, loadedLogs]) => {
        setOrder(loadedOrder);
        setLogs(loadedLogs);
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
        <h1 className="text-3xl font-semibold">Status audit history for {order?.customer}</h1>
        {error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : logs.length === 0 ? (
          <section className="rounded-lg border bg-white p-6 text-sm text-muted-foreground">
            No status changes recorded.
          </section>
        ) : (
          <section className="rounded-lg border bg-white shadow-sm">
            <div className="divide-y">
              {logs.map((log) => (
                <div className="flex justify-between gap-4 p-5" key={log.id}>
                  <div>
                    <p className="font-medium">
                      {log.fromStatus ?? 'Created'} -&gt; {log.toStatus}
                    </p>
                    <p className="text-sm text-muted-foreground">{formatDate(log.occurredAt)}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">Status change</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
