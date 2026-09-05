'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';

type LoginFormProps = {
  redirectTo?: string;
  submitLabel?: string;
  loadingLabel?: string;
  onSuccess?: () => void;
  onError?: (message: string) => void;
};

const labelClass = 'block text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-ink mb-2';
const inputClass =
  'w-full h-12 px-4 bg-white border border-hairline text-ink placeholder:text-muted-ink/60 focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-colors disabled:opacity-60';

export function AuthLoginForm({
  redirectTo = '/dashboard',
  submitLabel = 'Sign in',
  loadingLabel = 'Signing in…',
  onSuccess,
  onError,
}: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data.error || 'Login failed';
        setError(message);
        onError?.(message);
        return;
      }

      onSuccess?.();
      router.replace(redirectTo);
    } catch {
      const message = 'An error occurred during login';
      setError(message);
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className={labelClass}>Email</label>
        <input
          id="email"
          type="email"
          placeholder="you@practice.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          className={inputClass}
          autoComplete="email"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className={labelClass}>Password</label>
        <input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          className={inputClass}
          autoComplete="current-password"
          required
        />
      </div>

      {error && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full inline-flex items-center justify-center h-12 rounded-full bg-navy-800 text-white font-semibold text-[15px] hover:bg-ink transition-colors disabled:opacity-60"
      >
        {isLoading ? loadingLabel : submitLabel}
      </button>
    </form>
  );
}
