'use client';

import { useAuth } from '@/lib/supabase/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, userRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (requiredRole && !requiredRole.includes(userRole || '')) {
        router.push('/unauthorized');
      }
    }
  }, [isAuthenticated, isLoading, userRole, requiredRole, router]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredRole && !requiredRole.includes(userRole || '')) {
    return null;
  }

  return <>{children}</>;
}
