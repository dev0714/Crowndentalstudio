'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { FormEvent } from 'react';

type LoginFormProps = {
  redirectTo?: string;
  submitLabel?: string;
  loadingLabel?: string;
  onSuccess?: () => void;
  onError?: (message: string) => void;
};

export function AuthLoginForm({
  redirectTo = '/dashboard',
  submitLabel = 'Sign In',
  loadingLabel = 'Signing in...',
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="you@practice.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          className="border-slate-300 focus:border-slate-900 focus:ring-slate-900"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          Password
        </label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          className="border-slate-300 focus:border-slate-900 focus:ring-slate-900"
          required
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-slate-900 hover:bg-slate-800 text-white"
      >
        {isLoading ? loadingLabel : submitLabel}
      </Button>
    </form>
  );
}
