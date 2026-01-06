import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { adminSessionManager } from '../../utils/adminSessionManager';
import { AlertTriangle } from 'lucide-react';

interface DepartmentGuardProps {
  children: React.ReactNode;
  allowedDepartments: string[];
  redirectTo?: string;
}

export default function DepartmentGuard({
  children,
  allowedDepartments,
  redirectTo = '/admin'
}: DepartmentGuardProps) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [userDepartment, setUserDepartment] = useState<string>('');

  useEffect(() => {
    checkDepartmentAccess();
  }, [location.pathname]);

  const checkDepartmentAccess = () => {
    console.log('🏢 DepartmentGuard: Checking access for:', location.pathname);
    console.log('   Allowed departments:', allowedDepartments);

    const session = adminSessionManager.getSession();

    if (!session) {
      console.log('❌ DepartmentGuard: No session found');
      setHasAccess(false);
      setLoading(false);
      return;
    }

    const department = session.department;
    setUserDepartment(department);

    console.log('   User department:', department);
    console.log('   User role:', session.role);

    if (session.is_super_admin || session.is_platform_owner) {
      console.log('✅ DepartmentGuard: Access granted (Super Admin/Owner)');
      setHasAccess(true);
      setLoading(false);
      return;
    }

    const normalized = department.toLowerCase().trim();
    const hasMatch = allowedDepartments.some(allowed => {
      const allowedNormalized = allowed.toLowerCase().trim();
      return normalized === allowedNormalized ||
             normalized.includes(allowedNormalized) ||
             allowedNormalized.includes(normalized);
    });

    if (hasMatch) {
      console.log('✅ DepartmentGuard: Access granted (Department match)');
      setHasAccess(true);
    } else {
      console.log('🚫 DepartmentGuard: Access denied (Department mismatch)');
      console.log(`   Expected: ${allowedDepartments.join(' or ')}`);
      console.log(`   Actual: ${department}`);
      setHasAccess(false);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">جاري التحقق من الصلاحيات...</p>
          <p className="text-sm text-slate-500 mt-1">Verifying permissions...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    console.log('🚫 DepartmentGuard: Redirecting to:', redirectTo);

    return (
      <Navigate
        to={redirectTo}
        replace
        state={{
          from: location.pathname,
          reason: 'department_mismatch',
          userDepartment,
          requiredDepartments: allowedDepartments,
          message: 'ليس لديك صلاحية الوصول إلى هذا القسم'
        }}
      />
    );
  }

  console.log('✅ DepartmentGuard: Access granted');
  return <>{children}</>;
}
