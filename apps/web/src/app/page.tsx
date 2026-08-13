import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background p-8 text-foreground">
      <div className="mx-auto max-w-5xl space-y-6">
        <p className="text-sm font-medium text-muted-foreground">Orders and Settlements</p>
        <h1 className="text-3xl font-semibold tracking-tight">Financial operations dashboard</h1>
        <Button>View orders</Button>
      </div>
    </main>
  );
}
