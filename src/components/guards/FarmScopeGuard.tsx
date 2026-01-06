import { useEffect, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useStaffScope } from '../../hooks/useStaffScope';
import { AlertTriangle } from 'lucide-react';

interface FarmScopeGuardProps {
  children: React.ReactNode;
  farmIdParam?: string;
  redirectTo?: string;
  showError?: boolean;
}

/**
 * Guard to protect farm-specific routes
 * Uses the unified scope system to check farm access
 * Supports GLOBAL, DEPARTMENT, and FARM scopes
 */
export default function FarmScopeGuard({
  children,
  farmIdParam = 'farmId',
  redirectTo = '/admin/my-work',
  showError = false,
}: FarmScopeGuardProps) {
  const location = useLocation();
  const params = useParams();
  const { scope, loading, canAccessFarm, checkFarmAccess } = useStaffScope();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const farmId = params[farmIdParam];

  useEffect(() => {
    const verifyAccess = async () => {
      console.log('🌾 FarmScopeGuard: Checking farm access');
      console.log('   Route:', location.pathname);
      console.log('   Farm ID:', farmId);
      console.log('   Scope:', scope);

      if (loading) return;

      if (!scope) {
        console.log('❌ FarmScopeGuard: No scope data');
        setErrorMessage('لا توجد معلومات الصلاحيات');
        setHasAccess(false);
        return;
      }

      // If no farm ID in URL, allow access (list pages)
      if (!farmId) {
        console.log('⚠️ FarmScopeGuard: No farm ID in route - allowing access');
        setHasAccess(true);
        return;
      }

      // Check access using scope system
      const canAccess = await checkFarmAccess(farmId);

      if (canAccess) {
        console.log('✅ FarmScopeGuard: Access granted');
        console.log('   Scope Type:', scope.scopeType);
        console.log('   Farm accessible:', canAccess);
      } else {
        console.log('🚫 FarmScopeGuard: Access denied');
        console.log('   Scope Type:', scope.scopeType);
        console.log('   Allowed farms:', scope.farmIds);
        setErrorMessage('ليس لديك صلاحية الوصول إلى هذه المزرعة');
      }

      setHasAccess(canAccess);
    };

    verifyAccess();
  }, [scope, loading, farmId, location.pathname, checkFarmAccess]);

  // Loading state
  if (loading || hasAccess === null) {
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

  // Access denied
  if (!hasAccess) {
    console.log('🚫 FarmScopeGuard: Access denied - redirecting to:', redirectTo);

    if (showError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-red-100">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              ليس لديك صلاحية
            </h2>
            <p className="text-slate-600 mb-6">
              {errorMessage || 'عذراً، ليس لديك صلاحية الوصول إلى هذه المزرعة'}
            </p>
            <button
              onClick={() => window.location.href = redirectTo}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              العودة إلى صفحة العمل
            </button>
          </div>
        </div>
      );
    }

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
