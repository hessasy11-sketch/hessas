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
}

const SESSION_KEY = 'platform_staff_session';
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

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
