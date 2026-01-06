import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGatewayAccess } from '../../hooks/useGatewayAccess';
import { isAdminRoute, isExemptFromGuard, isRouteAllowedForUser } from '../../utils/gatewayRoutes';
import { Shield, AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export default function GatewayGuard({ children }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  const [isGM, setIsGM] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { cards, loading } = useGatewayAccess(userId || undefined);

  useEffect(() => {
    checkAccess();
  }, [location.pathname]);

  const checkAccess = async () => {
    setChecking(true);
    setError(null);

    const currentPath = location.pathname;

    // 1. التحقق: هل المسار إداري؟
    if (!isAdminRoute(currentPath)) {
      setChecking(false);
      return;
    }

    // 2. التحقق: هل المسار مستثنى من الحماية؟
    if (isExemptFromGuard(currentPath)) {
      setChecking(false);
      return;
    }

    // 3. التحقق: هل يوجد session؟
    const currentUserId = 'current-user-id'; // TODO: get from auth context
    if (!currentUserId) {
      setError('لا يوجد جلسة نشطة');
      navigate('/admin/gateway?error=no_session', { replace: true });
      return;
    }

    setUserId(currentUserId);

    // 4. انتظار تحميل البطاقات
    if (loading) {
      return;
    }

    // 5. التحقق: هل المستخدم GM؟
    const userIsGM = cards.some(card => card.is_gm_access);
    setIsGM(userIsGM);

    // 6. إذا كان GM: سماح فوري
    if (userIsGM) {
      setChecking(false);
      return;
    }

    // 7. التحقق: هل المسار مسموح للمستخدم؟
    const userCardKeys = cards.map(card => card.card_key);
    const hasAccess = isRouteAllowedForUser(currentPath, userCardKeys);

    if (!hasAccess) {
      setError('لا تملك صلاحية للوصول إلى هذه الصفحة');
      navigate('/admin/gateway?error=no_permission', { replace: true });
      return;
    }

    // 8. السماح بالوصول
    setChecking(false);
  };

  // شاشة التحميل
  if (checking || loading) {
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
