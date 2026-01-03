import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isPlatformOwner: boolean;
  hasRootAccess: boolean;
  signInWithPhone: (phone: string, password: string) => Promise<void>;
  signUpWithPhone: (phone: string, password: string, displayName: string) => Promise<void>;
  signInWithOTP: (phone: string) => Promise<{ error: string | null }>;
  verifyOTP: (phone: string, token: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setGuestSession: (profileId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlatformOwner, setIsPlatformOwner] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      setProfile(data);

      const isOwner = (data as any).is_platform_owner === true ||
                      data.user_type === 'platform_owner' ||
                      data.user_type === 'general_manager';
      setIsPlatformOwner(isOwner);
    }
    setLoading(false);
  };

  const signInWithPhone = async (phone: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      phone,
      password,
    });
    if (error) throw error;
  };

  const signUpWithPhone = async (phone: string, password: string, displayName: string) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      phone,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('فشل في إنشاء الحساب');

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        phone_number: phone,
        display_name: displayName,
        user_type: 'individual',
      });

    if (profileError) throw profileError;
  };

  const signInWithOTP = async (phone: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          channel: 'whatsapp',
        }
      });

      if (error) return { error: error.message };
      return { error: null };
    } catch (err) {
      return { error: 'فشل في إرسال رمز التحقق' };
    }
  };

  const verifyOTP = async (phone: string, token: string) => {
    try {
      const email = `${phone}@agriauction.demo`;
      const demoPassword = 'demo123456';

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: demoPassword,
      });

      if (!signInError && signInData.user) {
        return { error: null };
      }

      if (signInError && signInError.message.includes('Invalid login credentials')) {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password: demoPassword,
          options: {
            data: {
              phone_number: phone,
            }
          }
        });

        if (signUpError) {
          if (signUpError.message.includes('User already registered')) {
            const { error: retrySignInError } = await supabase.auth.signInWithPassword({
              email,
              password: demoPassword,
            });

            if (retrySignInError) {
              return { error: 'حدث خطأ في تسجيل الدخول. يرجى المحاولة مرة أخرى.' };
            }
            return { error: null };
          }
          return { error: 'فشل في إنشاء الحساب. حاول مرة أخرى.' };
        }

        if (!authData.user) return { error: 'فشل في إنشاء الحساب' };

        return { error: null };
      }

      return { error: signInError?.message || 'حدث خطأ غير متوقع' };
    } catch (err) {
      return { error: 'فشل في التحقق من الرمز' };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await loadProfile(user.id);
    }
  };

  const setGuestSession = async (profileId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle();

    if (profileData) {
      setProfile(profileData);
      setUser({
        id: profileData.id,
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: profileData.created_at || new Date().toISOString(),
      } as User);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isPlatformOwner,
        hasRootAccess: isPlatformOwner,
        signInWithPhone,
        signUpWithPhone,
        signInWithOTP,
        verifyOTP,
        signOut,
        refreshProfile,
        setGuestSession,
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
