import { adminSessionManager } from './adminSessionManager';

export interface GuardResult {
  allowed: boolean;
  redirectTo?: string;
  message?: string;
}

export const AdminGuard = (): GuardResult => {
  const isAuth = adminSessionManager.isAuthenticated();

  if (!isAuth) {
    return {
      allowed: false,
      redirectTo: '/admin/access',
      message: 'يجب تسجيل الدخول أولاً'
    };
  }

  return { allowed: true };
};

export const FarmContextGuard = (): GuardResult => {
  const session = adminSessionManager.getSession();

  if (!session) {
    return {
      allowed: false,
      redirectTo: '/admin/access',
      message: 'يجب تسجيل الدخول أولاً'
    };
  }

  const farms = adminSessionManager.getAvailableFarms();
  const currentFarm = adminSessionManager.getCurrentFarm();

  if (farms.length === 0) {
    return { allowed: true };
  }

  if (farms.length > 1 && !currentFarm) {
    return {
      allowed: false,
      message: 'يجب اختيار المزرعة أولاً'
    };
  }

  return { allowed: true };
};

export const PermissionGuard = (requiredBoard?: string, requiredSection?: string): GuardResult => {
  const session = adminSessionManager.getSession();

  if (!session) {
    return {
      allowed: false,
      redirectTo: '/admin/access'
    };
  }

  if (session.is_platform_owner || session.is_super_admin) {
    return { allowed: true };
  }

  return { allowed: true };
};

export const checkRouteAccess = (path: string): GuardResult => {
  if (path.startsWith('/admin')) {
    const adminCheck = AdminGuard();
    if (!adminCheck.allowed) return adminCheck;

    if (path.includes('/b2f') || path.includes('/operations')) {
      const farmCheck = FarmContextGuard();
      if (!farmCheck.allowed) return farmCheck;
    }
  }

  return { allowed: true };
};
