import { ReactNode } from 'react';
import { usePermissionCheck } from '../../hooks/useRolePermissions';
import { Shield, Lock, AlertTriangle } from 'lucide-react';

interface PermissionGuardProps {
  children: ReactNode;
  platformRole: string | null;
  permissionKey: string;
  action: 'create' | 'view' | 'edit' | 'delete' | 'approve' | 'reject' | 'assign' | 'upload_proof' | 'review_reports' | 'send_to_management';
  fallback?: ReactNode;
  showMessage?: boolean;
}

export function PermissionGuard({
  children,
  platformRole,
  permissionKey,
  action,
  fallback,
  showMessage = true
}: PermissionGuardProps) {
  const { hasPermission, loading } = usePermissionCheck(platformRole);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const hasAccess = hasPermission(permissionKey, action);

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showMessage) {
      return (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center" dir="rtl">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-red-900 mb-2">
            ليس لديك صلاحية الوصول
          </h3>
          <p className="text-red-700 mb-4">
            هذه الصفحة تتطلب صلاحيات خاصة للوصول إليها
          </p>
          <div className="bg-red-100 rounded-lg p-4 text-right">
            <p className="text-sm text-red-800">
              <strong>الصلاحية المطلوبة:</strong> {permissionKey} - {action}
            </p>
            <p className="text-sm text-red-800 mt-1">
              <strong>دورك الحالي:</strong> {platformRole || 'غير محدد'}
            </p>
          </div>
        </div>
      );
    }

    return null;
  }

  return <>{children}</>;
}

interface PageGuardProps {
  children: ReactNode;
  platformRole: string | null;
  pageKey: string;
  showMessage?: boolean;
}

export function PageGuard({
  children,
  platformRole,
  pageKey,
  showMessage = true
}: PageGuardProps) {
  const { canAccessPage, loading } = usePermissionCheck(platformRole);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  const hasAccess = canAccessPage(pageKey);

  if (!hasAccess) {
    if (showMessage) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Shield className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                وصول محظور
              </h1>
              <p className="text-lg text-gray-600 mb-6">
                ليس لديك الصلاحيات الكافية للوصول إلى هذه الصفحة
              </p>
            </div>

            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-bold text-red-900 mb-2">معلومات الوصول:</h3>
                  <div className="space-y-2 text-sm text-red-800">
                    <p><strong>الصفحة المطلوبة:</strong> {pageKey}</p>
                    <p><strong>دورك الحالي:</strong> {platformRole || 'غير محدد'}</p>
                    <p><strong>السبب:</strong> هذه الصفحة مخصصة للإدارة العليا فقط</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-bold text-blue-900 mb-2">ماذا يمكنك فعله؟</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• تواصل مع المدير المباشر</li>
                  <li>• اطلب رفع صلاحياتك</li>
                  <li>• راجع الصفحات المتاحة لك</li>
                </ul>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-bold text-green-900 mb-2">الصلاحيات المطلوبة:</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• مالك المنصة</li>
                  <li>• مدير عام</li>
                  <li>• المدير العام</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => window.history.back()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all"
              >
                العودة للخلف
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  return <>{children}</>;
}

interface ButtonGuardProps {
  children: ReactNode;
  platformRole: string | null;
  permissionKey: string;
  action: 'create' | 'view' | 'edit' | 'delete' | 'approve' | 'reject' | 'assign' | 'upload_proof' | 'review_reports' | 'send_to_management';
  showDisabled?: boolean;
  disabledTooltip?: string;
}

export function ButtonGuard({
  children,
  platformRole,
  permissionKey,
  action,
  showDisabled = false,
  disabledTooltip
}: ButtonGuardProps) {
  const { hasPermission, loading } = usePermissionCheck(platformRole);

  if (loading) {
    return null;
  }

  const hasAccess = hasPermission(permissionKey, action);

  if (!hasAccess) {
    if (showDisabled) {
      return (
        <div className="relative group">
          <div className="opacity-50 pointer-events-none">
            {children}
          </div>
          {disabledTooltip && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {disabledTooltip}
            </div>
          )}
        </div>
      );
    }
    return null;
  }

  return <>{children}</>;
}
