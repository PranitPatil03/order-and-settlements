import { ArrowUpRight, CircleDollarSign, ClipboardList, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CircleDollarSign className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold">CrossVal</p>
              <p className="text-xs text-muted-foreground">Orders and settlements</p>
            </div>
          </div>
          <Button variant="outline" className="hidden sm:inline-flex">
            Sign in
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 lg:px-8">
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Overview</p>
            <h1 className="mt-2 text-3xl font-semibold">Orders dashboard</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Track order totals, payments, and outstanding balances in one place.
            </p>
          </div>
          <Button className="shrink-0">
            <Plus className="size-4" aria-hidden="true" />
            Create order
          </Button>
        </section>

        <section className="grid gap-4 sm:grid-cols-3" aria-label="Order summary">
          {[
            ['Total orders', '0', 'All orders'],
            ['Outstanding', '$0.00', 'Amount due'],
            ['Collected', '$0.00', 'Gross payments'],
          ].map(([label, value, helper]) => (
            <div key={label} className="rounded-lg border bg-white p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-3 text-2xl font-semibold">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Recent orders</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your latest order activity will appear here.
              </p>
            </div>
            <Button variant="outline" className="gap-1.5">
              View all
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <ClipboardList className="size-6" aria-hidden="true" />
            </div>
            <h3 className="mt-4 font-medium">No orders yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Create your first order to start tracking payments and balances.
            </p>
            <Button className="mt-5" variant="outline">
              <Plus className="size-4" aria-hidden="true" />
              Create your first order
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
