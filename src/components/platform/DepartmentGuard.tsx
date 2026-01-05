import { ReactNode } from 'react';
import { Lock, AlertTriangle, Shield } from 'lucide-react';
import { useDepartmentAccess } from '../../hooks/useDepartmentAccess';

interface DepartmentGuardProps {
  department: 'b2f' | 'b2b' | 'finance' | 'marketing' | 'executive';
  children: ReactNode;
  staffId?: string;
  fallback?: ReactNode;
  showMessage?: boolean;
}

export default function DepartmentGuard({
  department,
  children,
  staffId = 'GM-001',
  fallback,
  showMessage = true
}: DepartmentGuardProps) {
  const { checkAccess, loading, isExecutive } = useDepartmentAccess(staffId);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-slate-600 rounded-full"></div>
      </div>
    );
  }

  const hasAccess = checkAccess(department) || isExecutive;

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showMessage) {
    return null;
  }

  const departmentNames = {
    b2f: { ar: 'استثمار المزارع', en: 'Farm Investment' },
    b2b: { ar: 'المزادات', en: 'Auctions' },
    finance: { ar: 'المالية', en: 'Finance' },
    marketing: { ar: 'التسويق', en: 'Marketing' },
    executive: { ar: 'الإدارة التنفيذية', en: 'Executive Management' }
  };

  const deptName = departmentNames[department];

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-8">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Lock className="w-10 h-10 text-slate-400" />
          </div>

          <div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              الوصول محظور
            </h3>
            <p className="text-slate-600 mb-1">
              لا يمكنك الوصول إلى قسم {deptName.ar}
            </p>
            <p className="text-sm text-slate-500">
              {deptName.en} Department - Access Denied
            </p>
          </div>

          <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 text-right">
                <p className="font-bold mb-1">هذا القسم غير مخصص لك</p>
                <p>يرجى الاتصال بالإدارة للحصول على الصلاحيات المطلوبة</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Shield className="w-4 h-4" />
            <span>Protected by Department Access Control</span>
          </div>
        </div>
      </div>
    </div>
  );
}
