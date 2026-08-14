'use client';

import Link from 'next/link';
import { CircleDollarSign, LogOut, Users } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';

export function AppHeader({ userName }: { userName?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const signOut = async () => {
    await authClient.signOut();
    router.replace('/login');
  };

  return (
    <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <CircleDollarSign className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold">CrossVal</p>
            <p className="text-xs text-muted-foreground">Orders and settlements</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/orders"
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition ${
              pathname.startsWith('/orders')
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'bg-white text-foreground hover:bg-muted'
            }`}
          >
            Orders
          </Link>
          <Link
            href="/customers"
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition ${
              pathname.startsWith('/customers')
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'bg-white text-foreground hover:bg-muted'
            }`}
          >
            <Users className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Customers</span>
          </Link>
          {userName ? (
            <span className="hidden text-sm text-muted-foreground sm:inline">{userName}</span>
          ) : null}
          <Button variant="outline" onClick={signOut} aria-label="Sign out">
            <LogOut className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
