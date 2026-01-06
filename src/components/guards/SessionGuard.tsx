import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { adminSessionManager } from '../../utils/adminSessionManager';
import { Shield } from 'lucide-react';

interface SessionGuardProps {
  children: React.ReactNode;
}

export default function SessionGuard({ children }: SessionGuardProps) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    checkSession();
  }, [location.pathname]);

  const checkSession = async () => {
    try {
      console.log('🔐 SessionGuard: Checking session for:', location.pathname);

      const localSession = adminSessionManager.getSession();

      if (!localSession) {
        console.log('❌ SessionGuard: No local session found');
        setHasSession(false);
        setLoading(false);
        return;
      }

      console.log('✅ SessionGuard: Local session exists');

      const dbSession = await adminSessionManager.restoreSessionFromDB();

      if (!dbSession) {
        console.log('❌ SessionGuard: DB session invalid or expired');
        setHasSession(false);
        setLoading(false);
        return;
      }

      console.log('✅ SessionGuard: Session valid');
      console.log('   - Staff ID:', dbSession.staff_id);
      console.log('   - Role:', dbSession.role);
      console.log('   - Department:', dbSession.department);

      setHasSession(true);
      setLoading(false);
    } catch (error) {
      console.error('❌ SessionGuard: Error checking session:', error);
      setHasSession(false);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">جاري التحقق من الجلسة...</p>
          <p className="text-sm text-slate-500 mt-1">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!hasSession) {
    console.log('🚫 SessionGuard: Access denied - no valid session');
    console.log('   Redirecting to: /');

    return (
      <Navigate
        to="/"
        replace
        state={{
          from: location.pathname,
          reason: 'session_required',
          message: 'يجب تسجيل الدخول للوصول إلى هذه الصفحة'
        }}
      />
    );
  }

  console.log('✅ SessionGuard: Access granted');
  return <>{children}</>;
}
