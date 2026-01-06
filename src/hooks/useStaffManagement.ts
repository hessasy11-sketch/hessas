import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface StaffMember {
  id: string;
  name_ar: string;
  phone: string;
  role: string;
  department: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  created_by_gm_id: string | null;
}

interface CreateStaffParams {
  name_ar: string;
  phone: string;
  role: string;
  department?: string;
  farm_id?: string;
}

interface CreateStaffResult {
  success: boolean;
  staff_id?: string;
  initial_password?: string;
  phone?: string;
  error?: string;
}

export function useStaffManagement(gmId: string) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (gmId) {
      fetchStaff();
    }
  }, [gmId]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.rpc('get_all_staff', {
        p_gm_id: gmId,
      });

      if (fetchError) throw fetchError;

      setStaff(data || []);
    } catch (err) {
      console.error('Error fetching staff:', err);
      setError(err instanceof Error ? err.message : 'خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const createStaff = async (params: CreateStaffParams): Promise<CreateStaffResult> => {
    try {
      const { data, error: createError } = await supabase.rpc('create_staff_account', {
        p_gm_id: gmId,
        p_name_ar: params.name_ar,
        p_phone: params.phone,
        p_role: params.role,
        p_department: params.department || null,
        p_farm_id: params.farm_id || null,
      });

      if (createError) throw createError;

      const result = data as CreateStaffResult;

      if (result.success) {
        await fetchStaff();
      }

      return result;
    } catch (err) {
      console.error('Error creating staff:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'خطأ في إنشاء الموظف',
      };
    }
  };

  const suspendStaff = async (staffId: string, reason?: string) => {
    try {
      const { data, error: suspendError } = await supabase.rpc('suspend_staff_account', {
        p_gm_id: gmId,
        p_staff_id: staffId,
        p_reason: reason || null,
      });

      if (suspendError) throw suspendError;

      const result = data as { success: boolean; error?: string };

      if (result.success) {
        await fetchStaff();
      }

      return result;
    } catch (err) {
      console.error('Error suspending staff:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'خطأ في إيقاف الحساب',
      };
    }
  };

  const activateStaff = async (staffId: string) => {
    try {
      const { data, error: activateError } = await supabase.rpc('activate_staff_account', {
        p_gm_id: gmId,
        p_staff_id: staffId,
      });

      if (activateError) throw activateError;

      const result = data as { success: boolean; error?: string };

      if (result.success) {
        await fetchStaff();
      }

      return result;
    } catch (err) {
      console.error('Error activating staff:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'خطأ في تفعيل الحساب',
      };
    }
  };

  const resetPassword = async (staffId: string) => {
    try {
      const { data, error: resetError } = await supabase.rpc('reset_staff_password', {
        p_gm_id: gmId,
        p_staff_id: staffId,
      });

      if (resetError) throw resetError;

      const result = data as { success: boolean; new_password?: string; error?: string };

      if (result.success) {
        await fetchStaff();
      }

      return result;
    } catch (err) {
      console.error('Error resetting password:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'خطأ في إعادة تعيين كلمة المرور',
      };
    }
  };

  const verifyLogin = async (phone: string, password: string) => {
    try {
      const { data, error: verifyError } = await supabase.rpc('verify_staff_credentials', {
        p_phone: phone,
        p_password: password,
      });

      if (verifyError) throw verifyError;

      return data as {
        success: boolean;
        staff_id?: string;
        name_ar?: string;
        role?: string;
        department?: string;
        error?: string;
      };
    } catch (err) {
      console.error('Error verifying login:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'خطأ في التحقق',
      };
    }
  };

  return {
    staff,
    loading,
    error,
    createStaff,
    suspendStaff,
    activateStaff,
    resetPassword,
    verifyLogin,
    refresh: fetchStaff,
  };
}
