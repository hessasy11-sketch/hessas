const SESSION_KEY = 'hq_session_v2';

interface TempSession {
  role: 'platform_owner';
  full_name: string;
  created_at: string;
  last_activity_at: string;
}

export const tempSessionManager = {
  createSession(): TempSession {
    const session: TempSession = {
      role: 'platform_owner',
      full_name: 'GM (TEMP)',
      created_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString()
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },

  getSession(): TempSession | null {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    try {
      const session = JSON.parse(stored) as TempSession;
      this.updateActivity();
      return session;
    } catch {
      return null;
    }
  },

  updateActivity(): void {
    const session = this.getSession();
    if (session) {
      session.last_activity_at = new Date().toISOString();
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  },

  clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
  },

  hasValidSession(): boolean {
    return this.getSession() !== null;
  }
};
