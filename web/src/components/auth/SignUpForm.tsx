'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function SignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-primary-gradient rounded-full flex items-center justify-center shadow-green">
            <span className="text-3xl">✅</span>
          </div>
          <div>
            <h1 className="text-h1 text-gradient">Success!</h1>
            <p className="text-caption mt-2">Check your email to verify your account</p>
          </div>
        </div>

        <div className="card-fresh text-center space-y-4">
          <div className="text-4xl">📧</div>
          <h3 className="text-h3">Check your email</h3>
          <p className="text-body">
            We've sent you a verification link. Click it to activate your FridgeHero account and start saving food!
          </p>
          <button
            onClick={() => router.push('/auth/signin')}
            className="btn-secondary"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

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
          <h2 className="text-h2">Join FridgeHero</h2>
          <p className="text-caption mt-2">Start your journey to zero food waste</p>
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
                  autoComplete="new-password"
                  required
                  className="input-premium pl-10 w-full"
                  placeholder="Choose a secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <p className="text-small mt-1 text-gray-500">
                Minimum 6 characters required
              </p>
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
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <span>Create Account</span>
                <span>→</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Benefits Preview */}
      <div className="space-y-3">
        <p className="text-caption text-center">What you'll get:</p>
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <span className="text-lg">🛒</span>
            <span className="text-small">Smart grocery tracking with barcode scanning</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-lg">⏰</span>
            <span className="text-small">Automated expiry notifications</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-lg">🍳</span>
            <span className="text-small">Recipe suggestions for expiring items</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-lg">🌱</span>
            <span className="text-small">Reduce food waste and save money</span>
          </div>
        </div>
      </div>
    </div>
  );
} 