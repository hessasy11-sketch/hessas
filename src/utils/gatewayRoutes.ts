export interface RouteMapping {
  cardKey: string;
  allowedRoles: string[];
  allowedRoutes: string[];
  defaultRoute: string;
}

export const GATEWAY_ROUTE_MAPPINGS: RouteMapping[] = [
  {
    cardKey: 'executive_command',
    allowedRoles: ['general_manager'],
    allowedRoutes: [
      '/admin/operations-room/global',
      '/admin/operations-room/decisions',
      '/admin/operations-room/executive-log',
      '/admin/operations-room/logs',
      '/admin/operations-room/authorities',
      '/admin/hq',
      '/admin/hq/*'
    ],
    defaultRoute: '/admin/operations-room/global'
  },
  {
    cardKey: 'b2f_operations_room',
    allowedRoles: ['general_manager', 'b2f_assistant', 'national_farm_manager'],
    allowedRoutes: [
      '/admin/operations-room/b2f',
      '/admin/b2f/ops-room',
      '/admin/b2f/ops-room/*'
    ],
    defaultRoute: '/admin/operations-room/b2f'
  },
  {
    cardKey: 'b2b_operations_room',
    allowedRoles: ['general_manager', 'b2b_assistant', 'auction_supervisor'],
    allowedRoutes: [
      '/admin/operations-room/b2b',
      '/admin/b2b',
      '/admin/b2b/*',
      '/admin/auctions',
      '/admin/auctions/*'
    ],
    defaultRoute: '/admin/operations-room/b2b'
  },
  {
    cardKey: 'farm_command',
    allowedRoles: ['general_manager', 'national_farm_manager', 'operations_manager'],
    allowedRoutes: [
      '/admin/b2f/farm-command',
      '/admin/b2f/farm-command/*',
      '/admin/farms/operations',
      '/admin/farms/setup',
      '/admin/farms/setup/*'
    ],
    defaultRoute: '/admin/b2f/farm-command'
  },
  {
    cardKey: 'farm_workspace',
    allowedRoles: ['general_manager', 'farm_manager', 'farm_supervisor', 'farm_worker'],
    allowedRoutes: [
      '/admin/b2f/farms',
      '/admin/b2f/farms/*'
    ],
    defaultRoute: '/admin/b2f/farms'
  },
  {
    cardKey: 'farm_manager_dashboard',
    allowedRoles: ['farm_manager'],
    allowedRoutes: [
      '/admin/farm-manager-dashboard',
      '/admin/farm/:farmId/*'
    ],
    defaultRoute: '/admin/farm-manager-dashboard'
  },
  {
    cardKey: 'my_work',
    allowedRoles: ['ALL'],
    allowedRoutes: [
      '/admin/my-work',
      '/admin/my-work/*'
    ],
    defaultRoute: '/admin/my-work'
  },
  {
    cardKey: 'finance_center',
    allowedRoles: ['general_manager', 'finance_manager', 'accountant', 'finance_assistant'],
    allowedRoutes: [
      '/admin/finance',
      '/admin/finance/*'
    ],
    defaultRoute: '/admin/finance'
  },
  {
    cardKey: 'marketing_center',
    allowedRoles: ['general_manager', 'marketing_manager', 'marketing_staff'],
    allowedRoutes: [
      '/admin/marketing',
      '/admin/marketing/*'
    ],
    defaultRoute: '/admin/marketing'
  },
  {
    cardKey: 'partners_vip',
    allowedRoles: ['general_manager', 'partners_manager'],
    allowedRoutes: [
      '/admin/partners',
      '/admin/partners/*'
    ],
    defaultRoute: '/admin/partners'
  },
  {
    cardKey: 'staff_permissions',
    allowedRoles: ['general_manager'],
    allowedRoutes: [
      '/admin/settings/staff',
      '/admin/settings/staff/*',
      '/admin/settings/gm-control',
      '/admin/team',
      '/admin/team/*'
    ],
    defaultRoute: '/admin/settings/staff'
  },
  {
    cardKey: 'platform_settings',
    allowedRoles: ['general_manager'],
    allowedRoutes: [
      '/admin/settings',
      '/admin/settings/*'
    ],
    defaultRoute: '/admin/settings'
  }
];

// دالة للتحقق إذا المسار مسموح للبطاقة
export function isRouteAllowedForCard(route: string, cardKey: string): boolean {
  const mapping = GATEWAY_ROUTE_MAPPINGS.find(m => m.cardKey === cardKey);
  if (!mapping) return false;

  return mapping.allowedRoutes.some(allowedRoute => {
    // إذا كان المسار المسموح ينتهي بـ /* فهذا يعني أي شيء تحت هذا المسار
    if (allowedRoute.endsWith('/*')) {
      const basePath = allowedRoute.slice(0, -2);
      return route.startsWith(basePath);
    }
    // مطابقة دقيقة
    return route === allowedRoute;
  });
}

// دالة للتحقق إذا المسار مسموح للمستخدم (بناءً على البطاقات المتاحة له)
export function isRouteAllowedForUser(route: string, userCardKeys: string[]): boolean {
  // إذا لم يكن لدى المستخدم أي بطاقات
  if (userCardKeys.length === 0) return false;

  // التحقق إذا أي من بطاقات المستخدم تسمح بهذا المسار
  return userCardKeys.some(cardKey => isRouteAllowedForCard(route, cardKey));
}

// دالة للحصول على المسار الافتراضي للبطاقة
export function getDefaultRouteForCard(cardKey: string): string {
  const mapping = GATEWAY_ROUTE_MAPPINGS.find(m => m.cardKey === cardKey);
  return mapping?.defaultRoute || '/admin/gateway';
}

// دالة للتحقق إذا المسار إداري (يحتاج Guard)
export function isAdminRoute(route: string): boolean {
  return route.startsWith('/admin') || route.startsWith('/hq');
}

// دالة للتحقق إذا المسار مستثنى من الـ Guard
export function isExemptFromGuard(route: string): boolean {
  const exemptRoutes = [
    '/admin/gateway',
    '/admin/invite',
    '/',
    '/search'
  ];

  return exemptRoutes.some(exempt => route === exempt || route.startsWith(exempt + '?'));
}

// دالة للحصول على جميع المسارات المسموحة للمستخدم
export function getAllowedRoutesForUser(userCardKeys: string[]): string[] {
  const allowedRoutes: string[] = [];

  userCardKeys.forEach(cardKey => {
    const mapping = GATEWAY_ROUTE_MAPPINGS.find(m => m.cardKey === cardKey);
    if (mapping) {
      allowedRoutes.push(...mapping.allowedRoutes);
    }
  });

  return allowedRoutes;
}

// دالة للحصول على البطاقة المناسبة للمسار
export function getCardForRoute(route: string): string | null {
  for (const mapping of GATEWAY_ROUTE_MAPPINGS) {
    if (isRouteAllowedForCard(route, mapping.cardKey)) {
      return mapping.cardKey;
    }
  }
  return null;
}

// دالة للتحقق من الوصول بناءً على الدور مباشرة
export function isRouteAllowedForRole(route: string, userRole: string): boolean {
  if (userRole === 'general_manager') {
    return true;
  }

  for (const mapping of GATEWAY_ROUTE_MAPPINGS) {
    const routeMatches = mapping.allowedRoutes.some(allowedRoute => {
      if (allowedRoute.endsWith('/*')) {
        const basePath = allowedRoute.slice(0, -2);
        return route.startsWith(basePath);
      }
      return route === allowedRoute;
    });

    if (routeMatches) {
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
