import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ControlSession {
  isActive: boolean;
  reason: string | null;
  activatedAt: string | null;
  activatedBy: string | null;
  staffName: string | null;
}

export function useAbsoluteControl() {
  const [session, setSession] = useState<ControlSession>(() => {
    const saved = localStorage.getItem('absolute_control_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {
          isActive: false,
          reason: null,
          activatedAt: null,
          activatedBy: null,
          staffName: null
        };
      }
    }
    return {
      isActive: false,
      reason: null,
      activatedAt: null,
      activatedBy: null,
      staffName: null
    };
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('absolute_control_session', JSON.stringify(session));
  }, [session]);

  const activate = useCallback(async (reason: string, staffId: string, staffName: string) => {
    setLoading(true);
    try {
      const newSession: ControlSession = {
        isActive: true,
        reason,
        activatedAt: new Date().toISOString(),
        activatedBy: staffId,
        staffName
      };

      const { error: logError } = await supabase
        .from('audit_logs')
        .insert({
          staff_id: staffId,
          staff_name: staffName,
          action: 'ACTIVATE_ABSOLUTE_CONTROL',
          category: 'platform',
          entity_type: 'control_mode',
          entity_id: null,
          entity_name: 'Absolute Control Mode',
          details: { reason },
          result: 'success',
          notes: `تم تفعيل وضع السيطرة المطلقة. السبب: ${reason}`
        });

      if (logError) {
        console.error('Error logging activation:', logError);
      }

      setSession(newSession);
      return { success: true };
    } catch (error) {
      console.error('Error activating control mode:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, []);

  const deactivate = useCallback(async (staffId: string, staffName: string) => {
    setLoading(true);
    try {
      const { error: logError } = await supabase
        .from('audit_logs')
        .insert({
          staff_id: staffId,
          staff_name: staffName,
          action: 'DEACTIVATE_ABSOLUTE_CONTROL',
          category: 'platform',
          entity_type: 'control_mode',
          entity_id: null,
          entity_name: 'Absolute Control Mode',
          details: {
            previous_reason: session.reason,
            duration_minutes: session.activatedAt
              ? Math.round((new Date().getTime() - new Date(session.activatedAt).getTime()) / 60000)
              : 0
          },
          result: 'success',
          notes: 'تم إلغاء وضع السيطرة المطلقة'
        });

      if (logError) {
        console.error('Error logging deactivation:', logError);
      }

      setSession({
        isActive: false,
        reason: null,
        activatedAt: null,
        activatedBy: null,
        staffName: null
      });

      return { success: true };
    } catch (error) {
      console.error('Error deactivating control mode:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [session]);

  return {
    session,
    loading,
    activate,
    deactivate
  };
}
