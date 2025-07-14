'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { searchParams } = new URL(window.location.href);
      const code = searchParams.get('code');
      const next = searchParams.get('next') ?? '/dashboard';

      if (code) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          router.push(next);
        } catch (error) {
          router.push('/auth/error');
        }
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-center">
        <h2 className="text-2xl font-semibold text-gray-900">
          Completing authentication...
        </h2>
        <p className="mt-2 text-gray-600">Please wait while we verify your account.</p>
      </div>
    </div>
  );
} 