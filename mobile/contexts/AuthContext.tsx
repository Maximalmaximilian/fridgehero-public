import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string) => Promise<{ error?: any; isNewUser?: boolean }>;
  signInWithGoogle: () => Promise<{ error?: any }>;
  signInWithApple: () => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    try {
      console.log('🔐 Starting signup process for:', email);
      
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        console.error('🔐 Auth signup error:', error);
        console.error('🔐 Error details:', {
          message: error.message,
          status: error.status,
        });
        
        throw error;
      }
      
      console.log('🔐 Auth signup successful, user created:', data.user?.id);
      
      // Wait for database trigger to complete
      if (data.user) {
        console.log('🔐 Waiting for database trigger to complete...');
        await new Promise(resolve => setTimeout(resolve, 3000)); // Increased wait time
        
        // Verify the profile was created
        console.log('🔐 Checking if profile was created...');
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, full_name, created_at')
          .eq('id', data.user.id)
          .single();
          
        if (profile) {
          console.log('🔐 ✅ Profile created successfully by trigger:', profile);
          
          // Also check notification preferences
          const { data: prefs, error: prefsError } = await supabase
            .from('notification_preferences')
            .select('user_id, created_at')
            .eq('user_id', data.user.id)
            .single();
            
          if (prefs) {
            console.log('🔐 ✅ Notification preferences created successfully:', prefs);
          } else if (prefsError) {
            console.log('🔐 ⚠️ Notification preferences not found:', prefsError.message);
          }
          
        } else if (profileError) {
          console.log('🔐 ⚠️ Profile check failed:', profileError);
          
          // Provide more specific error information
          if (profileError.code === 'PGRST116') {
            console.log('🔐 💡 Profile was not created - database trigger likely failed');
            console.log('🔐 💡 This is a database configuration issue, not a user error');
            // Don't fail the signup - the user was created in auth
          } else if (profileError.message.includes('row-level security')) {
            console.log('🔐 💡 Profile might exist but RLS is blocking access');
          } else {
            console.log('🔐 💡 Unexpected profile error:', profileError.message);
          }
        }
      }
      
      console.log('🔐 Signup process completed successfully');
      return { error: null, isNewUser: true };
      
    } catch (error: any) {
      console.error('🔐 SignUp process failed:', error);
      
      // Provide more user-friendly error messages
      if (error.message?.includes('User already registered')) {
        return { 
          error: {
            ...error,
            message: 'An account with this email already exists. Please try signing in instead.'
          }
        };
      }
      
      if (error.message?.includes('Password should be at least')) {
        return { 
          error: {
            ...error,
            message: 'Password must be at least 6 characters long.'
          }
        };
      }
      
      if (error.message?.includes('Invalid email')) {
        return { 
          error: {
            ...error,
            message: 'Please enter a valid email address.'
          }
        };
      }
      
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: Platform.OS === 'ios' 
            ? 'fridgehero://auth/callback'
            : 'com.fridgehero.app://auth/callback',
        },
      });
      return { error };
    } catch (error) {
      console.error('Google sign-in error:', error);
      return { error };
    }
  };

  const signInWithApple = async () => {
    try {
      if (Platform.OS !== 'ios') {
        return { error: { message: 'Apple Sign-In is only available on iOS' } };
      }
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: 'fridgehero://auth/callback',
        },
      });
      return { error };
    } catch (error) {
      console.error('Apple sign-in error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signInWithApple,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 