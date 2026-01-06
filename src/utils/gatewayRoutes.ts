// خريطة المسارات لكل بطاقة في البوابة الذكية

export interface RouteMapping {
  cardKey: string;
  allowedRoutes: string[];
  defaultRoute: string;
}

export const GATEWAY_ROUTE_MAPPINGS: RouteMapping[] = [
  {
    cardKey: 'command_room',
    allowedRoutes: [
      '/admin/operations-room/hub',
      '/admin/operations-room/global',
      '/admin/operations-room/decisions',
      '/admin/operations-room/authorities',
      '/admin/operations-room/logs',
      '/admin/operations-room/*'
    ],
    defaultRoute: '/admin/operations-room/hub'
  },
  {
    cardKey: 'b2f_operations',
    allowedRoutes: [
      '/admin/b2f',
      '/admin/operations-room/b2f',
      '/admin/b2f/*'
    ],
    defaultRoute: '/admin/b2f'
  },
  {
    cardKey: 'b2b_auctions',
    allowedRoutes: [
      '/admin/b2b',
      '/admin/operations-room/b2b',
      '/admin/auctions',
      '/admin/b2b/*'
    ],
    defaultRoute: '/admin/b2b'
  },
  {
    cardKey: 'farm_command',
    allowedRoutes: [
      '/admin/farms/operations',
      '/admin/farms/*'
    ],
    defaultRoute: '/admin/farms/operations'
  },
  {
    cardKey: 'financial_management',
    allowedRoutes: [
      '/admin/finance',
      '/admin/finance/*'
    ],
    defaultRoute: '/admin/finance'
  },
  {
    cardKey: 'marketing_management',
    allowedRoutes: [
      '/admin/marketing',
      '/admin/marketing/*'
    ],
    defaultRoute: '/admin/marketing'
  },
  {
    cardKey: 'team_management',
    allowedRoutes: [
      '/admin/team',
      '/admin/team/*'
    ],
    defaultRoute: '/admin/team'
  },
  {
    cardKey: 'settings',
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
