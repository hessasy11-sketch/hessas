import { createContext, useContext, ReactNode } from 'react';

interface InvestorAuthContextType {
  user: null;
  account: null;
  loading: false;
}

const InvestorAuthContext = createContext<InvestorAuthContextType>({
  user: null,
  account: null,
  loading: false,
});

export function InvestorAuthProvider({ children }: { children: ReactNode }) {
  return (
    <InvestorAuthContext.Provider
      value={{
        user: null,
        account: null,
        loading: false,
      }}
    >
      {children}
    </InvestorAuthContext.Provider>
  );
}

export function useInvestorAuth() {
  return useContext(InvestorAuthContext);
}
