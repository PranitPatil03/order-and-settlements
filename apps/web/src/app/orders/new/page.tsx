import { Suspense } from 'react';

import { OrderForm } from '@/components/orders/order-form';

export default function NewOrderPage() {
  return (
    <Suspense fallback={<NewOrderLoading />}>
      <OrderForm />
    </Suspense>
  );
}

function NewOrderLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Loading order form...
      </div>
    </main>
  );
}
