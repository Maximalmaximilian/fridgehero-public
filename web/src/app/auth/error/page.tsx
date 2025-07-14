import Link from 'next/link';

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900">
          Authentication Error
        </h2>
        <p className="mt-2 text-gray-600">
          There was a problem authenticating your account.
        </p>
        <div className="mt-6">
          <Link
            href="/auth/signin"
            className="text-indigo-600 hover:text-indigo-500"
          >
            Return to sign in
          </Link>
        </div>
      </div>
    </div>
  );
} 