import { useEffect, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { adminSessionManager } from '../../utils/adminSessionManager';
import { supabase } from '../../lib/supabase';
import { Lock } from 'lucide-react';

interface FarmScopeGuardProps {
  children: React.ReactNode;
  farmIdParam?: string;
  redirectTo?: string;
}

export default function FarmScopeGuard({
  children,
  farmIdParam = 'farmId',
  redirectTo = '/admin/b2f'
}: FarmScopeGuardProps) {
  const location = useLocation();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    checkFarmAccess();
  }, [location.pathname, params]);

  const checkFarmAccess = async () => {
    console.log('🌾 FarmScopeGuard: Checking farm access');
    console.log('   Route:', location.pathname);
    console.log('   Params:', params);

    const session = adminSessionManager.getSession();

    if (!session) {
      console.log('❌ FarmScopeGuard: No session found');
      setErrorMessage('لا توجد جلسة نشطة');
      setHasAccess(false);
      setLoading(false);
      return;
    }

    if (session.is_super_admin || session.is_platform_owner) {
      console.log('✅ FarmScopeGuard: Access granted (Super Admin/Owner)');
      setHasAccess(true);
      setLoading(false);
      return;
    }

    const targetFarmId = params[farmIdParam];

    if (!targetFarmId) {
      console.log('⚠️ FarmScopeGuard: No farm ID in route - allowing access');
      setHasAccess(true);
      setLoading(false);
      return;
    }

    console.log('   Target Farm ID:', targetFarmId);
    console.log('   Staff ID:', session.staff_id);

    try {
      const { data: membership, error } = await supabase
        .from('b2f_farm_team')
        .select('id, farm_id, staff_id, role')
        .eq('farm_id', targetFarmId)
        .eq('staff_id', session.staff_id)
        .maybeSingle();

      if (error) {
        console.error('❌ FarmScopeGuard: Database error:', error);
        setErrorMessage('خطأ في التحقق من الصلاحيات');
        setHasAccess(false);
        setLoading(false);
        return;
      }

      if (!membership) {
        console.log('🚫 FarmScopeGuard: No farm membership found');
        console.log(`   Staff ${session.staff_id} is NOT a member of farm ${targetFarmId}`);
        setErrorMessage('ليس لديك صلاحية الوصول إلى هذه المزرعة');
        setHasAccess(false);
        setLoading(false);
        return;
      }

      console.log('✅ FarmScopeGuard: Access granted');
      console.log('   Membership ID:', membership.id);
      console.log('   Farm Role:', membership.role);

      adminSessionManager.setCurrentFarm(targetFarmId);

      setHasAccess(true);
      setLoading(false);
    } catch (error) {
      console.error('❌ FarmScopeGuard: Exception:', error);
      setErrorMessage('خطأ في التحقق من الصلاحيات');
      setHasAccess(false);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">جاري التحقق من صلاحية الوصول للمزرعة...</p>
          <p className="text-sm text-slate-500 mt-1">Verifying farm access...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    console.log('🚫 FarmScopeGuard: Access denied - redirecting to:', redirectTo);

    return (
      <Navigate
        to={redirectTo}
        replace
        state={{
          from: location.pathname,
          reason: 'farm_access_denied',
          message: errorMessage,
          farmId: params[farmIdParam]
        }}
      />
    );
  }

  console.log('✅ FarmScopeGuard: Rendering protected content');
  return <>{children}</>;
}
