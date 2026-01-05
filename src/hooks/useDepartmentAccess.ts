import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface DepartmentAccess {
  canAccessB2F: boolean;
  canAccessB2B: boolean;
  canAccessFinance: boolean;
  canAccessMarketing: boolean;
  canAccessExecutive: boolean;
  allowedDepartments: string[];
  primaryDepartment: string | null;
  isExecutive: boolean;
  loading: boolean;
}

export function useDepartmentAccess(staffId?: string) {
  const [access, setAccess] = useState<DepartmentAccess>({
    canAccessB2F: false,
    canAccessB2B: false,
    canAccessFinance: false,
    canAccessMarketing: false,
    canAccessExecutive: false,
    allowedDepartments: [],
    primaryDepartment: null,
    isExecutive: false,
    loading: true
  });

  useEffect(() => {
    if (!staffId) {
      setAccess(prev => ({ ...prev, loading: false }));
      return;
    }

    loadDepartmentAccess();
  }, [staffId]);

  const loadDepartmentAccess = async () => {
    if (!staffId) return;

    try {
      const { data: staffData, error: staffError } = await supabase
        .from('staff_departments_view')
        .select('*')
        .eq('staff_code', staffId)
        .single();

      if (staffError) throw staffError;

      const allowedDepts = staffData?.allowed_departments || [];
      const primaryDept = staffData?.primary_department;
      const isExec = primaryDept === 'executive' || staffData?.pack_department === 'executive';

      setAccess({
        canAccessB2F: allowedDepts.includes('b2f') || isExec,
        canAccessB2B: allowedDepts.includes('b2b') || isExec,
        canAccessFinance: allowedDepts.includes('finance') || isExec,
        canAccessMarketing: allowedDepts.includes('marketing') || isExec,
        canAccessExecutive: isExec,
        allowedDepartments: allowedDepts,
        primaryDepartment: primaryDept,
        isExecutive: isExec,
        loading: false
      });
    } catch (error) {
      console.error('Error loading department access:', error);
      setAccess(prev => ({ ...prev, loading: false }));
    }
  };

  const checkAccess = (department: string): boolean => {
    if (access.isExecutive) return true;
    return access.allowedDepartments.includes(department);
  };

  return {
    ...access,
    checkAccess,
    refresh: loadDepartmentAccess
  };
}
