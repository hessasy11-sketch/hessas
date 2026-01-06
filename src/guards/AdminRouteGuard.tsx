import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Crown, ShieldAlert } from 'lucide-react';

interface StaffSession {
  staffId: string;
  staffName: string;
  role: string;
  department?: string;
  loginAt: string;
}

interface CardRouteMapping {
  cardKey: string;
  allowedRoles: string[];
  routePatterns: string[];
}

const CARD_ROUTE_MAPPINGS: CardRouteMapping[] = [
  {
    cardKey: 'executive_command',
    allowedRoles: ['general_manager'],
    routePatterns: ['/admin/operations-room/global', '/admin/hq']
  },
  {
    cardKey: 'b2f_operations_room',
    allowedRoles: ['general_manager', 'b2f_assistant', 'national_farm_manager'],
    routePatterns: ['/admin/operations-room/b2f']
  },
  {
    cardKey: 'b2b_operations_room',
    allowedRoles: ['general_manager', 'b2b_assistant', 'auction_supervisor'],
    routePatterns: ['/admin/operations-room/b2b', '/admin/b2b']
  },
  {
    cardKey: 'farm_command',
    allowedRoles: ['general_manager', 'national_farm_manager', 'operations_manager'],
    routePatterns: ['/admin/b2f/farm-command']
  },
  {
    cardKey: 'farm_workspace',
    allowedRoles: ['general_manager', 'farm_manager', 'farm_supervisor', 'farm_worker'],
    routePatterns: ['/admin/b2f/farms']
  },
  {
    cardKey: 'my_work',
    allowedRoles: ['ALL'],
    routePatterns: ['/admin/my-work']
  },
  {
    cardKey: 'finance_center',
    allowedRoles: ['general_manager', 'finance_manager', 'accountant', 'finance_assistant'],
    routePatterns: ['/admin/finance']
  },
  {
    cardKey: 'marketing_center',
    allowedRoles: ['general_manager', 'marketing_manager', 'marketing_staff'],
    routePatterns: ['/admin/marketing']
  },
  {
    cardKey: 'partners_vip',
    allowedRoles: ['general_manager', 'partners_manager'],
    routePatterns: ['/admin/partners']
  },
  {
    cardKey: 'staff_permissions',
    allowedRoles: ['general_manager'],
    routePatterns: ['/admin/settings/staff', '/admin/team']
  },
  {
    cardKey: 'platform_settings',
    allowedRoles: ['general_manager'],
    routePatterns: ['/admin/settings']
  }
];

function matchRoute(currentPath: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    if (pattern.includes(':')) {
      const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '[^/]+') + '(/.*)?$');
      return regex.test(currentPath);
    }
    return currentPath.startsWith(pattern);
  });
}

function canAccessRoute(userRole: string, currentPath: string): boolean {
  if (userRole === 'general_manager') {
    return true;
  }

  for (const mapping of CARD_ROUTE_MAPPINGS) {
    if (matchRoute(currentPath, mapping.routePatterns)) {
      if (mapping.allowedRoles.includes('ALL')) {
        return true;
      }
      if (mapping.allowedRoles.includes(userRole)) {
        return true;
      }
      return false;
    }
  }

  return false;
}

interface Props {
  children: React.ReactNode;
}

export default function AdminRouteGuard({ children }: Props) {
  const location = useLocation();
  const [session, setSession] = useState<StaffSession | null>(null);
  const [checking, setChecking] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const savedSession = localStorage.getItem('staff_session');

    if (!savedSession) {
      setChecking(false);
      return;
    }

    try {
      const parsedSession = JSON.parse(savedSession) as StaffSession;
      setSession(parsedSession);

      const hasAccess = canAccessRoute(parsedSession.role, location.pathname);

      if (!hasAccess) {
        console.warn('🚫 ACCESS DENIED:', {
          role: parsedSession.role,
          path: location.pathname,
          reason: 'Route not allowed for this role'
        });
        setAccessDenied(true);
      }

      setChecking(false);
    } catch (err) {
      console.error('Error parsing session:', err);
      localStorage.removeItem('staff_session');
      setChecking(false);
    }
  }, [location.pathname]);

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

  if (!session) {
    return <Navigate to="/admin/gateway" replace />;
  }

  if (accessDenied) {
    return <Navigate to="/admin/gateway?error=access_denied" replace />;
  }

  return <>{children}</>;
}

export function GatewayAccessInfo() {
  const [session, setSession] = useState<StaffSession | null>(null);

  useEffect(() => {
    const savedSession = localStorage.getItem('staff_session');
    if (savedSession) {
      try {
        setSession(JSON.parse(savedSession));
      } catch (err) {
        console.error('Error parsing session:', err);
      }
    }
  }, []);

  if (!session) return null;

  const isGM = session.role === 'general_manager';

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className={`${
        isGM
          ? 'bg-gradient-to-r from-purple-600 to-indigo-600'
          : 'bg-gradient-to-r from-blue-600 to-cyan-600'
      } text-white px-4 py-2 rounded-xl shadow-lg backdrop-blur-sm border border-white/20`}>
        <div className="flex items-center gap-2">
          {isGM ? (
            <>
              <Crown className="w-4 h-4" />
              <span className="text-sm font-bold">GM Bypass Active</span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-4 h-4" />
              <span className="text-sm font-medium">{session.role}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
