import Link from 'next/link';
import SignInForm from '@/components/auth/SignInForm';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-hero-morning flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <SignInForm />
        
        {/* Switch to Sign Up */}
        <div className="text-center">
          <p className="text-caption">
            Don't have an account?{' '}
            <Link
              href="/auth/signup"
              className="font-medium text-primary-600 hover:text-primary-500 transition-colors duration-200"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 