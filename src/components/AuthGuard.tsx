'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function AuthGuard({ children, redirectTo = '/auth/login' }: AuthGuardProps) {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(redirectTo);
    }
  }, [user, isLoading, router, redirectTo]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-2xl font-bold text-white">CF</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p>Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, return null (redirect happens in useEffect)
  if (!user) {
    return null;
  }

  // User is authenticated, render children
  return <>{children}</>;
}
