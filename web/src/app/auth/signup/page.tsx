import Link from 'next/link';
import SignUpForm from '@/components/auth/SignUpForm';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-hero-morning flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <SignUpForm />
        
        {/* Switch to Sign In */}
        <div className="text-center">
          <p className="text-caption">
            Already have an account?{' '}
            <Link
              href="/auth/signin"
              className="font-medium text-primary-600 hover:text-primary-500 transition-colors duration-200"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 