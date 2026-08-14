'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, FileText, History, LogOut, Menu, RotateCcw, Users, X } from 'lucide-react';
import { useState } from 'react';

import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

const navigation = [
  { href: '/orders', label: 'Orders', icon: FileText },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/orders?view=refunded', label: 'Refunds', icon: RotateCcw },
  { href: '/orders?view=audit', label: 'Audit trail', icon: History },
];

export function AppShell({
  children,
  userName,
  userEmail,
}: {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  const signOut = async () => {
    await authClient.signOut();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-[#f6f8f6] text-slate-950">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#043a27] bg-[#064e34] px-4 py-5 text-white transition-transform lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-2">
          <Link
            href="/orders"
            className="flex items-center gap-3"
            onClick={() => setMobileOpen(false)}
          >
            <BrandLogo light />
          </Link>
          <button
            className="rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="mt-8 space-y-1" aria-label="Main navigation">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
            Workspace
          </p>
          {navigation.map((item) => {
            const itemPath = item.href.split('?')[0];
            const itemView = new URLSearchParams(item.href.split('?')[1] ?? '').get('view');
            const isNestedRefunds = pathname.endsWith('/refunds');
            const isNestedAudit = pathname.endsWith('/audit');
            const active = itemView
              ? searchParams.get('view') === itemView ||
                (itemView === 'refunded' && isNestedRefunds) ||
                (itemView === 'audit' && isNestedAudit)
              : pathname === itemPath &&
                !searchParams.get('view') &&
                !isNestedRefunds &&
                !isNestedAudit;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white',
                )}
              >
                <Icon className="size-[18px]" /> {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
            <div className="flex items-center gap-3">
              <Avatar name={userName ?? 'CrossVal user'} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {userName ?? 'Workspace owner'}
                </p>
                <p className="truncate text-xs text-white/60">{userEmail ?? 'Your workspace'}</p>
              </div>
              <ChevronDown className="ml-auto size-4 text-white/50" />
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-[18px]" /> Log out
          </button>
        </div>
      </aside>

      {mobileOpen ? (
        <button
          className="fixed inset-0 z-40 bg-slate-950/20 lg:hidden"
          aria-label="Close navigation overlay"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-[#dce6df] bg-[#fbfcfb]/90 px-5 backdrop-blur sm:px-8">
          <button
            className="rounded-xl border border-[#dce6df] bg-white p-2 text-slate-600 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex">
            <span className="font-medium text-slate-950">Workspace</span>
            <span>/</span>
            <span>
              {pathname.startsWith('/customers')
                ? 'Customers'
                : pathname.startsWith('/orders')
                  ? 'Orders'
                  : 'Dashboard'}
            </span>
          </div>
          <div className="ml-auto" />
        </header>
        <main className="min-h-[calc(100vh-68px)] px-5 py-7 sm:px-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return <img src="/favicon.svg" alt="CrossVal" className={cn(compact ? 'size-7' : 'size-8')} />;
}

export function BrandLogo({ light = false }: { light?: boolean }) {
  return (
    <img
      src="/logo.svg"
      alt="CrossVal"
      className={cn('h-auto w-[172px]', light && 'brightness-0 invert')}
    />
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <img
      className="size-9 shrink-0 rounded-full bg-[#cce6d7] object-cover"
      src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`}
      alt=""
    />
  );
}
