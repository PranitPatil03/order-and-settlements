'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ArrowRight, Check, Eye, EyeOff, LoaderCircle } from 'lucide-react';

import { authClient } from '@/lib/auth-client';
import { BrandLogo } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AuthForm({
  mode,
  landing = false,
}: {
  mode: 'sign-in' | 'sign-up';
  landing?: boolean;
}) {
  const router = useRouter();
  const isSignUp = mode === 'sign-up';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);
    const result = isSignUp
      ? await authClient.signUp.email({ name, email, password })
      : await authClient.signIn.email({ email, password });
    setIsSubmitting(false);
    if (result.error) {
      setErrorMessage(result.error.message ?? 'Unable to complete authentication.');
      return;
    }
    router.replace('/orders');
  };

  return (
    <main className="bg-[#f8f9fc] text-[#141b2d]">
      <div className="mx-auto grid min-h-screen overflow-hidden shadow-[0_24px_80px_rgba(28,66,45,0.08)] lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative hidden overflow-hidden bg-[#086b45] px-12 py-12 text-white lg:flex lg:flex-col">
          <BrandLogo light />
          <div className="relative mt-auto pb-8">
            <h1 className="text-7xl font-semibold leading-[1.01] tracking-[-0.065em]">
              Every order.
              <br />
              Every payment.
              <br />
              <span className="text-[#b9e8c9]">One clear view.</span>
            </h1>
            <p className="mt-8 max-w-lg text-2xl leading-9 text-white/75">
              Create payment requests, follow balances, and keep customer operations moving from one
              focused workspace.
            </p>
            <div className="mt-10 space-y-3 text-sm font-medium text-white/80">
              {[
                'Create and track customer orders',
                'Monitor paid, pending, and overdue balances',
                'Generate secure payment links',
                'Review refunds and audit history',
              ].map((feature) => (
                <div className="flex items-center gap-3" key={feature}>
                  <span className="flex size-5 items-center justify-center rounded-full bg-white/15 text-[#c9efd5]">
                    <Check className="size-3.5" />
                  </span>
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-[620px] items-center bg-[#f5faf7] px-3 py-10 sm:px-12 lg:px-20">
          <div className="w-full">
            <div className="mb-10 flex justify-center lg:hidden">
              <BrandLogo />
            </div>
            <h1 className="text-6xl font-semibold tracking-[-0.06em] text-slate-950">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="mt-5 text-2xl leading-9 text-slate-500">
              {isSignUp
                ? 'Start managing your orders and payments.'
                : 'Sign in to your account to continue.'}
            </p>

            <form className="mt-9 space-y-6" onSubmit={submit}>
              {isSignUp ? (
                <div className="space-y-2">
                  <Label className="text-base text-slate-700" htmlFor="name">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your name"
                    required
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label className="text-base text-slate-700" htmlFor="email">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base text-slate-700" htmlFor="password">
                    Password
                  </Label>
                  {!isSignUp ? (
                    <span className="text-xs text-slate-400">Minimum 8 characters</span>
                  ) : null}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className="pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
              </div>
              {errorMessage ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMessage}
                </p>
              ) : null}
              <Button
                className="h-14 w-full rounded-xl bg-gradient-to-r from-[#087f4f] via-[#0b6b45] to-[#075437] text-base shadow-[0_12px_24px_rgba(8,107,69,0.24)] hover:from-[#096d45] hover:via-[#075b3b] hover:to-[#06462f]"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <LoaderCircle className="size-5 animate-spin" />
                ) : (
                  <ArrowRight className="size-5" />
                )}
                {isSignUp ? 'Create account' : 'Sign in'}
              </Button>
            </form>

            <p className="mt-8 text-center text-base text-slate-400">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <Link
                className="font-semibold text-[#0b6b45] hover:text-[#075437]"
                href={isSignUp ? '/login' : '/signup'}
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </Link>
            </p>
            {landing ? (
              <p className="mt-8 text-center text-xs text-slate-400">
                Secure workspace access · © {new Date().getFullYear()} CrossVal
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
