import { createContext, useContext, ReactNode } from 'react';

interface InvestorAuthContextType {
  user: null;
  account: null;
  loading: false;
  investorPhone: null;
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

export function InvestorAuthProvider({ children }: { children: ReactNode }) {
  return (
    <InvestorAuthContext.Provider
      value={{
        user: null,
        account: null,
        loading: false,
        investorPhone: null,
        signOut: () => {},
        refreshAccountFromPhone: async () => {},
        signIn: async () => {},
        signUp: async () => {},
      }}
    >
      {children}
    </InvestorAuthContext.Provider>
  );
}

export function useInvestorAuth() {
  return useContext(InvestorAuthContext);
}
