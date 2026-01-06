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

      // تحقق من جلسة staff_session الجديدة أولاً
      let staffSessionData = localStorage.getItem('staff_session');

      // Fallback to platform_staff_session if staff_session doesn't exist
      if (!staffSessionData) {
        const platformSession = localStorage.getItem('platform_staff_session');
        if (platformSession) {
          try {
            const parsed = JSON.parse(platformSession);
            // Convert platform_staff_session to staff_session format
            const converted = {
              staffId: parsed.staff_id,
              staffName: parsed.full_name,
              role: parsed.role,
              department: parsed.department,
              loginAt: new Date(parsed.created_at).toISOString()
            };
            localStorage.setItem('staff_session', JSON.stringify(converted));
            staffSessionData = JSON.stringify(converted);
            console.log('✅ SessionGuard: Converted platform_staff_session to staff_session');
          } catch (err) {
            console.error('Error converting session:', err);
          }
        }
      }

      if (staffSessionData) {
        try {
          const staffSession = JSON.parse(staffSessionData);
          if (staffSession.staffId && staffSession.role) {
            console.log('✅ SessionGuard: Staff session found');
            console.log('   - Staff ID:', staffSession.staffId);
            console.log('   - Role:', staffSession.role);
            console.log('   - Department:', staffSession.department);

            // Update activity timestamp
            adminSessionManager.refreshActivity();

            setHasSession(true);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.log('❌ Invalid staff_session format');
        }
      }

      // إذا لم تكن جلسة staff_session، تحقق من platform_staff_session القديمة
      const localSession = adminSessionManager.getSession();

      if (!localSession) {
        console.log('❌ SessionGuard: No session found');
        setHasSession(false);
        setLoading(false);
        return;
      }

      console.log('✅ SessionGuard: Platform staff session exists');

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
      // Don't clear session on error, just deny access
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
    console.log('   Redirecting to: /admin/gateway');

    return (
      <Navigate
        to="/admin/gateway?error=no_session"
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
