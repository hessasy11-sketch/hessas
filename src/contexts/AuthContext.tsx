import { createContext, useContext, ReactNode } from 'react';

interface AuthContextType {
  user: null;
  profile: null;
  loading: false;
  isPlatformOwner: false;
  hasRootAccess: false;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: false,
  isPlatformOwner: false,
  hasRootAccess: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider
      value={{
        user: null,
        profile: null,
        loading: false,
        isPlatformOwner: false,
        hasRootAccess: false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
