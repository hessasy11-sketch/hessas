import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isAdminRoute, isExemptFromGuard, isRouteAllowedForRole } from '../../utils/gatewayRoutes';
import { AlertTriangle } from 'lucide-react';

interface StaffSession {
  staffId: string;
  staffName: string;
  role: string;
  department?: string;
  loginAt: string;
}

interface Props {
  children: React.ReactNode;
}

export default function GatewayGuard({ children }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAccess();
  }, [location.pathname]);

  const checkAccess = () => {
    setChecking(true);
    setError(null);

    const currentPath = location.pathname;

    if (!isAdminRoute(currentPath)) {
      setChecking(false);
      return;
    }

    if (isExemptFromGuard(currentPath)) {
      setChecking(false);
      return;
    }

    // Try staff_session first
    let savedSession = localStorage.getItem('staff_session');

    // Fallback to platform_staff_session if staff_session doesn't exist
    if (!savedSession) {
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
          savedSession = JSON.stringify(converted);
          console.log('✅ Converted platform_staff_session to staff_session');
        } catch (err) {
          console.error('Error converting session:', err);
        }
      }
    }

    if (!savedSession) {
      console.warn('🚫 NO SESSION - Redirecting to gateway');
      navigate('/admin/gateway?error=no_session', { replace: true });
      return;
    }

    try {
      const session: StaffSession = JSON.parse(savedSession);

      if (session.role === 'general_manager' || session.role === 'super_admin') {
        console.log('✅ GM/SUPER_ADMIN BYPASS - Full access granted');
        setChecking(false);
        return;
      }

      const hasAccess = isRouteAllowedForRole(currentPath, session.role);

      if (!hasAccess) {
        console.warn('🚫 ACCESS DENIED:', {
          role: session.role,
          path: currentPath,
          reason: 'Route not allowed for this role'
        });
        setError('لا تملك صلاحية للوصول إلى هذه الصفحة');
        // Don't redirect, just show error
        setChecking(false);
        return;
      }

      console.log('✅ ACCESS GRANTED:', {
        role: session.role,
        path: currentPath
      });
      setChecking(false);
    } catch (err) {
      console.error('Error parsing session:', err);
      localStorage.removeItem('staff_session');
      navigate('/admin/gateway?error=no_session', { replace: true });
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  // شاشة الخطأ
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border-2 border-red-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">تم منع الوصول</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/admin/gateway')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
          >
            العودة إلى البوابة
          </button>
        </div>
      </div>
    );
  }

  // السماح بالوصول
  return <>{children}</>;
}
