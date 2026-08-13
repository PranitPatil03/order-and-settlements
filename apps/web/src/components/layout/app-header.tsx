'use client';

import { CircleDollarSign, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';

export function AppHeader({ userName }: { userName?: string }) {
  const router = useRouter();

  const signOut = async () => {
    await authClient.signOut();
    router.replace('/login');
  };

  return (
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
        <div className="flex items-center gap-3">
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
