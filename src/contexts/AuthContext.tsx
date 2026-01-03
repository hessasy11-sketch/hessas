import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  phone_number: string;
  display_name: string;
  user_type: string;
  is_platform_owner: boolean;
  current_plan_type: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isPlatformOwner: boolean;
  hasRootAccess: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isPlatformOwner: false,
  hasRootAccess: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminSession = () => {
      const adminUserId = sessionStorage.getItem('adminUserId');
      const adminProfile = sessionStorage.getItem('adminProfile');

      if (adminUserId && adminProfile) {
        const parsedProfile = JSON.parse(adminProfile);
        setProfile(parsedProfile);
        setUser({ id: adminUserId } as User);
      }

      setLoading(false);
    };

    checkAdminSession();
  }, []);

  const signOut = async () => {
    sessionStorage.removeItem('adminUserId');
    sessionStorage.removeItem('adminProfile');
    sessionStorage.removeItem('adminSessionActive');
    sessionStorage.removeItem('adminRole');
    setUser(null);
    setProfile(null);
  };

  const isPlatformOwner = profile?.is_platform_owner === true || profile?.user_type === 'platform_owner';
  const hasRootAccess = isPlatformOwner;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isPlatformOwner,
        hasRootAccess,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
