interface FarmContext {
  farm_id: string;
  farm_name: string;
  role: string;
}

interface AdminSession {
  staff_id: string;
  user_id: string;
  full_name: string;
  role: string;
  role_title: string;
  department: string;
  is_super_admin: boolean;
  is_platform_owner: boolean;
  created_at: number;
  last_activity_at: number;
  current_farm_id?: string | null;
  available_farms?: FarmContext[];
  farm_roles_map?: Record<string, string>;
}

const SESSION_KEY = 'platform_staff_session';
const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes idle timeout

export const adminSessionManager = {
  createSession(sessionData: Omit<AdminSession, 'created_at' | 'last_activity_at'>): void {
    const now = Date.now();
    const session: AdminSession = {
      ...sessionData,
      created_at: now,
      last_activity_at: now,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  getSession(): AdminSession | null {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY);
      if (!sessionData) return null;

      const session: AdminSession = JSON.parse(sessionData);

      if (this.isSessionExpired(session)) {
        this.destroySession();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error reading admin session:', error);
      this.destroySession();
      return null;
    }
  },

  isSessionExpired(session: AdminSession): boolean {
    const now = Date.now();
    const idleTime = now - session.last_activity_at;
    return idleTime > IDLE_TIMEOUT_MS;
  },

  updateActivity(): void {
    const session = this.getSession();
    if (!session) return;

    session.last_activity_at = Date.now();
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  destroySession(): void {
    localStorage.removeItem(SESSION_KEY);
  },

  isAuthenticated(): boolean {
    const session = this.getSession();
    return session !== null;
  },

  getRole(): string | null {
    const session = this.getSession();
    return session?.role || null;
  },

  isSuperAdmin(): boolean {
    const session = this.getSession();
    return session?.is_super_admin || false;
  },

  isPlatformOwner(): boolean {
    const session = this.getSession();
    return session?.is_platform_owner || false;
  },

  getRemainingTime(): number {
    const session = this.getSession();
    if (!session) return 0;

    const now = Date.now();
    const idleTime = now - session.last_activity_at;
    const remaining = IDLE_TIMEOUT_MS - idleTime;

    return Math.max(0, remaining);
  },

  getRemainingMinutes(): number {
    return Math.floor(this.getRemainingTime() / (60 * 1000));
  },

  setFarmContext(farms: FarmContext[]): void {
    const session = this.getSession();
    if (!session || !farms) return;

    const farmRolesMap: Record<string, string> = {};
    farms.forEach(f => {
      farmRolesMap[f.farm_id] = f.role;
    });

    session.available_farms = farms;
    session.farm_roles_map = farmRolesMap;

    if (farms.length === 1) {
      session.current_farm_id = farms[0].farm_id;
    } else if (!session.current_farm_id && farms.length > 0) {
      session.current_farm_id = null;
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  setCurrentFarm(farmId: string | null): void {
    const session = this.getSession();
    if (!session) return;

    session.current_farm_id = farmId;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  getCurrentFarm(): string | null {
    const session = this.getSession();
    return session?.current_farm_id || null;
  },

  getAvailableFarms(): FarmContext[] {
    const session = this.getSession();
    return session?.available_farms || [];
  },

  getFarmRole(farmId: string): string | null {
    const session = this.getSession();
    return session?.farm_roles_map?.[farmId] || null;
  },

  isFarmManager(farmId?: string): boolean {
    const targetFarmId = farmId || this.getCurrentFarm();
    if (!targetFarmId) return false;
    return this.getFarmRole(targetFarmId) === 'farm_manager';
  },

  requiresFarmContext(): boolean {
    const session = this.getSession();
    if (!session) return false;

    const farms = session.available_farms || [];
    return farms.length > 1 && !session.current_farm_id;
  }
};

export function initActivityTracking(): void {
  const events = ['click', 'keydown', 'scroll', 'mousemove', 'touchstart'];

  let lastUpdate = 0;
  const UPDATE_THROTTLE = 5000;

  const updateActivity = () => {
    const now = Date.now();
    if (now - lastUpdate < UPDATE_THROTTLE) return;

    lastUpdate = now;
    adminSessionManager.updateActivity();
  };

  events.forEach(event => {
    window.addEventListener(event, updateActivity, { passive: true });
  });
}
