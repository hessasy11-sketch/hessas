import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface InvestorAccount {
  id: string;
  user_id: string;
  contact_name: string;
  contact_phone: string;
  pin_code: string;
  is_profile_complete: boolean;
  created_at: string;
  updated_at: string;
}

interface InvestorAuthContextType {
  user: User | null;
  account: InvestorAccount | null;
  investorPhone: string | null;
  loading: boolean;
  signUp: (phone: string, password: string, fullName: string) => Promise<{ user: User; account: InvestorAccount }>;
  signIn: (phone: string, password: string) => Promise<{ user: User }>;
  signOut: () => Promise<void>;
  refreshAccount: () => Promise<void>;
}

const InvestorAuthContext = createContext<InvestorAuthContextType | undefined>(undefined);

export function InvestorAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<InvestorAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadAccount(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          loadAccount(session.user.id);
        } else {
          setAccount(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadAccount = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('b2f_investor_accounts')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setAccount(data);
    } catch (error) {
      console.error('Error loading account:', error);
      setAccount(null);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (phone: string, password: string, fullName: string) => {
    try {
      console.log('🚀 Starting signUp process...');
      const email = phone.replace(/\D/g, '') + '@b2f.temp';
      console.log('📧 Email:', email);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            investor_type: 'b2f'
          }
        }
      });

      if (authError) {
        console.error('❌ Auth error:', authError);
        throw authError;
      }
      if (!authData.user) throw new Error('Failed to create user');

      console.log('✅ Auth user created:', authData.user.id);
      console.log('⏳ Waiting for session to stabilize...');
      await new Promise(resolve => setTimeout(resolve, 800));

      console.log('📝 Creating investor account...');
      const { data: accountData, error: accountError } = await supabase
        .from('b2f_investor_accounts')
        .insert({
          user_id: authData.user.id,
          contact_name: fullName,
          contact_phone: phone,
          is_profile_complete: false
        })
        .select()
        .single();

      if (accountError) {
        console.error('❌ Account creation error:', accountError);
        console.error('Error details:', {
          message: accountError.message,
          code: accountError.code,
          details: accountError.details
        });
        throw new Error('فشل في إنشاء حساب المستثمر. الرجاء المحاولة مرة أخرى.');
      }

      console.log('✅ Investor account created:', accountData.id);
      setAccount(accountData);
      return { user: authData.user, account: accountData };
    } catch (error: any) {
      console.error('❌ SignUp failed:', error);
      throw error;
    }
  };

  const signIn = async (phone: string, password: string) => {
    try {
      const email = phone.replace(/\D/g, '') + '@b2f.temp';

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      if (!data.user) throw new Error('Login failed');

      return { user: data.user };
    } catch (error: any) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setAccount(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const refreshAccount = async () => {
    if (user) {
      await loadAccount(user.id);
    }
  };

  return (
    <InvestorAuthContext.Provider
      value={{
        user,
        account,
        investorPhone: account?.contact_phone || null,
        loading,
        signUp,
        signIn,
        signOut,
        refreshAccount
      }}
    >
      {children}
    </InvestorAuthContext.Provider>
  );
}

export function useInvestorAuth() {
  const context = useContext(InvestorAuthContext);
  if (context === undefined) {
    throw new Error('useInvestorAuth must be used within InvestorAuthProvider');
  }
  return context;
}
