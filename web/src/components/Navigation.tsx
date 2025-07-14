'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClientComponentClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="glass border-b border-white/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            {/* Logo */}
            <Link 
              href="/dashboard" 
              className="flex items-center space-x-2 hover:scale-105 transition-transform duration-200"
            >
              <div className="w-8 h-8 bg-primary-gradient rounded-lg flex items-center justify-center shadow-green">
                <span className="text-white text-sm">🌿</span>
              </div>
              <span className="text-h3 text-gradient">FridgeHero</span>
            </Link>
            
            {/* Navigation Links */}
            <div className="hidden md:flex space-x-1">
              <Link
                href="/dashboard"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/dashboard')
                    ? 'bg-primary-100 text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                }`}
              >
                🏠 Dashboard
              </Link>
              <Link
                href="/items"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/items')
                    ? 'bg-primary-100 text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                }`}
              >
                📱 My Items
              </Link>
              <Link
                href="/recipes"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/recipes')
                    ? 'bg-primary-100 text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                }`}
              >
                🍳 Recipes
              </Link>
              <Link
                href="/households"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/households')
                    ? 'bg-primary-100 text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                }`}
              >
                👥 Households
              </Link>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-3">
            {/* Quick Add Button */}
            <Link
              href="/items/add"
              className="hidden sm:flex btn-secondary text-sm py-2 px-4"
            >
              + Add Item
            </Link>
            
            {/* User Menu */}
            <div className="relative">
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
                title="Sign Out"
              >
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-sm">👤</span>
                </div>
                <span className="hidden sm:block text-sm">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-white/10">
        <div className="px-4 py-2 space-y-1">
          <Link
            href="/dashboard"
            className={`block px-3 py-2 rounded-md text-sm font-medium ${
              isActive('/dashboard')
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
            }`}
          >
            🏠 Dashboard
          </Link>
          <Link
            href="/items"
            className={`block px-3 py-2 rounded-md text-sm font-medium ${
              isActive('/items')
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
            }`}
          >
            📱 My Items
          </Link>
          <Link
            href="/recipes"
            className={`block px-3 py-2 rounded-md text-sm font-medium ${
              isActive('/recipes')
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
            }`}
          >
            🍳 Recipes
          </Link>
          <Link
            href="/households"
            className={`block px-3 py-2 rounded-md text-sm font-medium ${
              isActive('/households')
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
            }`}
          >
            👥 Households
          </Link>
        </div>
      </div>
    </nav>
  );
} 