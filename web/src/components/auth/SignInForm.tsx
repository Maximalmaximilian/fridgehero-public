'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Refresh the router and redirect to dashboard
      router.refresh();
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="mx-auto w-20 h-20 bg-primary-gradient rounded-full flex items-center justify-center shadow-green">
          <span className="text-3xl">🌿</span>
        </div>
        <div>
          <h1 className="text-h1 text-gradient">FridgeHero</h1>
          <p className="text-caption mt-2">Save food. Save money. Save the planet.</p>
        </div>
      </div>

      {/* Form Container */}
      <div className="glass-card space-y-6">
        <div className="text-center">
          <h2 className="text-h2">Welcome Back</h2>
          <p className="text-caption mt-2">Ready to rescue some food?</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="card-expired animate-slide-up">
              <div className="flex items-center space-x-2">
                <span className="text-error-500">⚠️</span>
                <p className="text-sm text-error-700">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-body-medium mb-2">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400">📧</span>
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input-premium pl-10 w-full"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-body-medium mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400">🔒</span>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="input-premium pl-10 w-full"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full ${loading ? 'opacity-50 cursor-not-allowed' : ''} btn-primary flex items-center justify-center space-x-2`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <span>→</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Features Preview */}
      <div className="grid grid-cols-3 gap-4 pt-4">
        <div className="text-center space-y-2">
          <div className="text-2xl">📱</div>
          <p className="text-small">Scan barcodes</p>
        </div>
        <div className="text-center space-y-2">
          <div className="text-2xl">⏰</div>
          <p className="text-small">Track expiry</p>
        </div>
        <div className="text-center space-y-2">
          <div className="text-2xl">🍳</div>
          <p className="text-small">Get recipes</p>
        </div>
      </div>
    </div>
  );
} 