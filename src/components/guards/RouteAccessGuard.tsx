import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface RouteAccessGuardProps {
  children: React.ReactNode;
  requiredCardKey?: string;
}

export default function RouteAccessGuard({ children, requiredCardKey }: RouteAccessGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkAccess();
  }, [location.pathname]);

  const checkAccess = async () => {
    setIsChecking(true);

    try {
      // الحصول على الجلسة
      const sessionData = localStorage.getItem('staff_session');

      if (!sessionData) {
        console.log('❌ No session found, redirecting to gateway');
        navigate('/admin/gateway?error=no_session');
        return;
      }

      const session = JSON.parse(sessionData);
      const staffId = session.staffId;

      // التحقق من الصلاحية
      if (!requiredCardKey) {
        // إذا لم يكن هناك card key مطلوب، السماح بالدخول
        setHasAccess(true);
        setIsChecking(false);
        return;
      }

      // استدعاء دالة التحقق
      const { data, error } = await supabase.rpc('check_gateway_access', {
        p_user_id: staffId,
        p_card_key: requiredCardKey
      });

      if (error) {
        console.error('Error checking access:', error);
        navigate('/admin/gateway?error=access_denied');
        return;
      }

      if (!data) {
        console.log('❌ Access denied for card:', requiredCardKey);
        navigate('/admin/gateway?error=no_permission');
        return;
      }

      console.log('✅ Access granted for card:', requiredCardKey);
      setHasAccess(true);
    } catch (err) {
      console.error('Error in RouteAccessGuard:', err);
      navigate('/admin/gateway?error=access_denied');
    } finally {
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}
