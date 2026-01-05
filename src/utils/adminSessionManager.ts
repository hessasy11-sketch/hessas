import { supabase } from '../lib/supabase';

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
  session_token?: string;
  db_session_id?: string;
}

const SESSION_KEY = 'platform_staff_session';
const IDLE_TIMEOUT_MS = 60 * 60 * 1000;

export const adminSessionManager = {
  setSession(sessionData: Omit<AdminSession, 'created_at' | 'last_activity_at'>): void {
    const now = Date.now();
    const session: AdminSession = {
      ...sessionData,
      created_at: now,
      last_activity_at: now,
    };

    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      console.log('✅ Session saved to localStorage:', SESSION_KEY);
      console.log('   - Staff ID:', session.staff_id);
      console.log('   - Role:', session.role);
      console.log('   - Full Name:', session.full_name);

      const verify = localStorage.getItem(SESSION_KEY);
      if (verify) {
        console.log('✅ VERIFIED: Session exists in localStorage');
      } else {
        console.error('❌ CRITICAL: Session NOT found after saving!');
      }
    } catch (error) {
      console.error('❌ Exception saving session:', error);
      throw error;
    }
  },

  async createSession(sessionData: Omit<AdminSession, 'created_at' | 'last_activity_at' | 'session_token' | 'db_session_id'>): Promise<boolean> {
    try {
      console.log('🔄 Creating session for:', sessionData.staff_id);

      const { data: dbSession, error } = await supabase
        .from('platform_staff_sessions')
        .insert({
          staff_id: sessionData.staff_id,
          login_method: 'qr',
          device_info: {
            browser: navigator.userAgent,
            timestamp: new Date().toISOString()
          },
          ip_address: null,
          user_agent: navigator.userAgent,
          is_active: true,
          landing_route: '/hq'
        })
        .select('id, session_token')
        .single();

      if (error) {
        console.error('❌ Error creating database session:', error);
        return false;
      }

      console.log('✅ DB session created:', dbSession.id);

      this.setSession({
        ...sessionData,
        session_token: dbSession.session_token,
        db_session_id: dbSession.id,
      });

      const savedSession = this.getSession();
      if (!savedSession) {
        console.error('❌ CRITICAL: Session not saved properly!');
        return false;
      }

      console.log('✅ Session creation complete and verified');
      return true;
    } catch (error) {
      console.error('❌ Exception creating session:', error);
      return false;
    }
  },

  async restoreSessionFromDB(): Promise<AdminSession | null> {
    try {
      const localSession = localStorage.getItem(SESSION_KEY);
      if (!localSession) return null;

      const parsedSession: AdminSession = JSON.parse(localSession);

      if (!parsedSession.session_token) {
        console.log('❌ No session token found in localStorage');
        this.clearSession();
        return null;
      }

      const { data: dbSession, error } = await supabase
        .from('platform_staff_sessions')
        .select(`
          id,
          session_token,
          staff_id,
          is_active,
          started_at,
          last_activity_at,
          ended_at,
          staff:platform_staff(
            id,
            user_id,
            full_name,
            phone_number,
            role,
            department
          )
        `)
        .eq('session_token', parsedSession.session_token)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error restoring session from DB:', error);
        this.clearSession();
        return null;
      }

      if (!dbSession || !dbSession.staff) {
        console.log('❌ Session not found in DB or inactive');
        this.clearSession();
        return null;
      }

      const lastActivity = new Date(dbSession.last_activity_at).getTime();
      const idleTime = Date.now() - lastActivity;

      if (idleTime > IDLE_TIMEOUT_MS) {
        console.log('❌ Session expired (idle timeout)');
        await this.logout();
        return null;
      }

      const staffData: any = dbSession.staff;
      const restoredSession: AdminSession = {
        staff_id: staffData.id,
        user_id: staffData.user_id || '',
        full_name: staffData.full_name,
        role: staffData.role,
        role_title: staffData.role || '',
        department: staffData.department || '',
        is_super_admin: staffData.role === 'super_admin',
        is_platform_owner: staffData.role === 'platform_owner',
        created_at: new Date(dbSession.started_at).getTime(),
        last_activity_at: Date.now(),
        session_token: dbSession.session_token,
        db_session_id: dbSession.id,
        current_farm_id: parsedSession.current_farm_id,
        available_farms: parsedSession.available_farms,
        farm_roles_map: parsedSession.farm_roles_map,
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(restoredSession));

      await this.updateActivityInDB();

      console.log('✅ Session restored from DB successfully');
      return restoredSession;
    } catch (error) {
      console.error('Exception restoring session:', error);
      this.clearSession();
      return null;
    }
  },

  getSession(): AdminSession | null {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY);
      if (!sessionData) {
        return null;
      }

      const session: AdminSession = JSON.parse(sessionData);

      if (this.isSessionExpired(session)) {
        console.log('⏱️ Session expired - clearing');
        this.clearSession();
        return null;
      }

      return session;
    } catch (error) {
      console.error('❌ Error reading admin session:', error);
      this.clearSession();
      return null;
    }
  },

  loadFromStorage(): AdminSession | null {
    console.log('🔄 Loading session from storage...');
    const session = this.getSession();
    if (session) {
      console.log('✅ Session loaded successfully');
      console.log('   - Staff ID:', session.staff_id);
      console.log('   - Role:', session.role);
      console.log('   - Full Name:', session.full_name);
      return session;
    } else {
      console.log('ℹ️ No valid session found in storage');
      return null;
    }
  },

  clearSession(): void {
    try {
      localStorage.removeItem(SESSION_KEY);
      console.log('🗑️ Session cleared from localStorage');
    } catch (error) {
      console.error('❌ Error clearing session:', error);
    }
  },

  isSessionValid(): boolean {
    const session = this.getSession();
    return session !== null;
  },

  isSessionExpired(session: AdminSession): boolean {
    const now = Date.now();
    const idleTime = now - session.last_activity_at;
    return idleTime > IDLE_TIMEOUT_MS;
  },

  refreshActivity(): void {
    const session = this.getSession();
    if (!session) return;

    session.last_activity_at = Date.now();
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  async updateActivity(): Promise<void> {
    this.refreshActivity();
    await this.updateActivityInDB();
  },

  async updateActivityInDB(): Promise<void> {
    const session = this.getSession();
    if (!session || !session.db_session_id) return;

    try {
      await supabase
        .from('platform_staff_sessions')
        .update({
          last_activity_at: new Date().toISOString()
        })
        .eq('id', session.db_session_id);
    } catch (error) {
      console.error('Error updating activity in DB:', error);
    }
  },

  async logout(): Promise<void> {
    console.log('🚪 Logout initiated');
    const session = this.getSession();

    if (session?.db_session_id) {
      try {
        await supabase
          .from('platform_staff_sessions')
          .update({
            is_active: false,
            ended_at: new Date().toISOString()
          })
          .eq('id', session.db_session_id);

        console.log('✅ Session ended in database');
      } catch (error) {
        console.error('❌ Error ending session in DB:', error);
      }
    }

    this.clearSession();
  },

  async destroySession(): Promise<void> {
    await this.logout();
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

  const dbUpdateInterval = setInterval(() => {
    adminSessionManager.updateActivityInDB();
  }, 30000);

  window.addEventListener('beforeunload', () => {
    clearInterval(dbUpdateInterval);
  });
}
