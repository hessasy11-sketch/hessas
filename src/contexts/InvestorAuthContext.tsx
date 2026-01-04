import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface InvestorAccount {
  id: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  is_profile_complete: boolean;
}

interface InvestorAuthContextType {
  user: InvestorAccount | null;
  account: InvestorAccount | null;
  loading: boolean;
  investorPhone: string | null;
  signOut: () => void;
  refreshAccountFromPhone: () => Promise<void>;
  signIn: (phone: string, pin: string) => Promise<void>;
  signUp: (phone: string, pin: string, name: string) => Promise<void>;
}

const InvestorAuthContext = createContext<InvestorAuthContextType>({
  user: null,
  account: null,
  loading: false,
  investorPhone: null,
  signOut: () => {},
  refreshAccountFromPhone: async () => {},
  signIn: async () => {},
  signUp: async () => {},
});

const INVESTOR_STORAGE_KEY = 'b2f_investor_account';
const INVESTOR_PHONE_KEY = 'b2f_investor_phone';

export function InvestorAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<InvestorAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvestorFromStorage();
  }, []);

  const loadInvestorFromStorage = () => {
    try {
      const storedAccount = localStorage.getItem(INVESTOR_STORAGE_KEY);
      const storedPhone = localStorage.getItem(INVESTOR_PHONE_KEY);

      if (storedAccount) {
        const account = JSON.parse(storedAccount);
        setUser(account);
        console.log('✅ تم تحميل حساب المستثمر من التخزين المحلي:', account);
      } else if (storedPhone) {
        refreshAccountFromPhone();
      }
    } catch (error) {
      console.error('❌ خطأ في تحميل حساب المستثمر:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshAccountFromPhone = async () => {
    try {
      const storedPhone = localStorage.getItem(INVESTOR_PHONE_KEY);
      if (!storedPhone) return;

      const { data, error } = await supabase.rpc('get_investor_by_phone', {
        p_phone: storedPhone
      });

      if (error) throw error;

      if (data) {
        const account = typeof data === 'string' ? JSON.parse(data) : data;
        setUser(account);
        localStorage.setItem(INVESTOR_STORAGE_KEY, JSON.stringify(account));
        console.log('✅ تم تحديث حساب المستثمر:', account);
      }
    } catch (error) {
      console.error('❌ خطأ في تحديث حساب المستثمر:', error);
    }
  };

  const signIn = async (phone: string, pin: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('verify_investor_login', {
        p_phone: phone,
        p_pin: pin
      });

      if (error) throw error;

      const result = typeof data === 'string' ? JSON.parse(data) : data;

      if (!result.success) {
        throw new Error(result.error || 'فشل تسجيل الدخول');
      }

      const account = result.account;
      setUser(account);
      localStorage.setItem(INVESTOR_STORAGE_KEY, JSON.stringify(account));
      localStorage.setItem(INVESTOR_PHONE_KEY, phone);

      console.log('✅ تم تسجيل الدخول بنجاح:', account);
    } catch (error: any) {
      console.error('❌ خطأ في تسجيل الدخول:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (phone: string, pin: string, name: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('create_investor_account', {
        p_phone: phone,
        p_pin: pin,
        p_name: name
      });

      if (error) throw error;

      const result = typeof data === 'string' ? JSON.parse(data) : data;

      if (!result.success) {
        throw new Error(result.error || 'فشل إنشاء الحساب');
      }

      console.log('✅ تم إنشاء الحساب بنجاح');

      await signIn(phone, pin);
    } catch (error: any) {
      console.error('❌ خطأ في إنشاء الحساب:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem(INVESTOR_STORAGE_KEY);
    localStorage.removeItem(INVESTOR_PHONE_KEY);
    console.log('✅ تم تسجيل الخروج');
  };

  return (
    <InvestorAuthContext.Provider
      value={{
        user,
        account: user,
        loading,
        investorPhone: user?.contact_phone || null,
        signOut,
        refreshAccountFromPhone,
        signIn,
        signUp,
      }}
    >
      {children}
    </InvestorAuthContext.Provider>
  );
}

export function useInvestorAuth() {
  return useContext(InvestorAuthContext);
}
