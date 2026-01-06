import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ImpersonationState {
  isActive: boolean;
  targetStaffId: string | null;
  targetStaffName: string | null;
  targetRole: string | null;
  targetDepartment: string | null;
  startedAt: string | null;
}

interface ImpersonationContextType {
  impersonation: ImpersonationState;
  startImpersonation: (staffId: string, staffName: string, role?: string, department?: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  isGM: boolean;
  effectiveStaffId: string | null;
  effectiveRole: string | null;
  realGMId: string | null;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

interface Props {
  children: ReactNode;
}

export function ImpersonationProvider({ children }: Props) {
  const [impersonation, setImpersonation] = useState<ImpersonationState>({
    isActive: false,
    targetStaffId: null,
    targetStaffName: null,
    targetRole: null,
    targetDepartment: null,
    startedAt: null,
  });

  const [isGM, setIsGM] = useState(false);
  const [realGMId, setRealGMId] = useState<string | null>(null);

  useEffect(() => {
    checkIfGM();
  }, []);

  const checkIfGM = async () => {
    try {
      const gmId = 'current-gm-id';
      const { data: staff } = await supabase
        .from('platform_staff')
        .select('id, role')
        .eq('id', gmId)
        .single();

      if (staff && staff.role === 'general_manager') {
        setIsGM(true);
        setRealGMId(staff.id);
      }
    } catch (err) {
      console.error('Error checking GM status:', err);
    }
  };

  const startImpersonation = async (
    staffId: string,
    staffName: string,
    role?: string,
    department?: string
  ) => {
    if (!isGM) {
      console.error('Only GM can use View-As');
      return;
    }

    const startTime = new Date().toISOString();

    setImpersonation({
      isActive: true,
      targetStaffId: staffId,
      targetStaffName: staffName,
      targetRole: role || null,
      targetDepartment: department || null,
      startedAt: startTime,
    });

    await logImpersonationEvent('started', staffId, staffName);
  };

  const stopImpersonation = async () => {
    if (!impersonation.isActive) return;

    await logImpersonationEvent('stopped', impersonation.targetStaffId, impersonation.targetStaffName);

    setImpersonation({
      isActive: false,
      targetStaffId: null,
      targetStaffName: null,
      targetRole: null,
      targetDepartment: null,
      startedAt: null,
    });
  };

  const logImpersonationEvent = async (
    action: 'started' | 'stopped',
    targetStaffId: string | null,
    targetStaffName: string | null
  ) => {
    try {
      await supabase.from('executive_impersonation_logs').insert({
        gm_id: realGMId,
        action,
        target_staff_id: targetStaffId,
        target_staff_name: targetStaffName,
        current_path: window.location.pathname,
      });
    } catch (err) {
      console.error('Error logging impersonation event:', err);
    }
  };

  const effectiveStaffId = impersonation.isActive ? impersonation.targetStaffId : realGMId;
  const effectiveRole = impersonation.isActive ? impersonation.targetRole : 'general_manager';

  return (
    <ImpersonationContext.Provider
      value={{
        impersonation,
        startImpersonation,
        stopImpersonation,
        isGM,
        effectiveStaffId,
        effectiveRole,
        realGMId,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within ImpersonationProvider');
  }
  return context;
}
