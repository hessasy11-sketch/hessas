import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface FarmCommandPulse {
  active_farms: number;
  at_risk_farms: number;
  pending_decisions: number;
  high_expenses_today: number;
}

interface FarmHealthCategory {
  id: string;
  name: string;
  location: string;
  created_at: string;
  overdue_count?: number;
}

interface FarmHealthCategories {
  newly_born: FarmHealthCategory[];
  no_manager: FarmHealthCategory[];
  at_risk: FarmHealthCategory[];
  healthy: FarmHealthCategory[];
}

interface FarmCommandListItem {
  farm_id: string;
  farm_name: string;
  farm_location: string;
  operational_status: string;
  manager_name: string | null;
  last_activity: string | null;
  pending_tasks_count: number;
  overdue_tasks_count: number;
  bookings_enabled: boolean;
}

export function useFarmCommand() {
  const [pulse, setPulse] = useState<FarmCommandPulse | null>(null);
  const [healthCategories, setHealthCategories] = useState<FarmHealthCategories | null>(null);
  const [farmsList, setFarmsList] = useState<FarmCommandListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [pulseResult, categoriesResult, listResult] = await Promise.all([
        supabase.rpc('get_farm_command_pulse'),
        supabase.rpc('get_farms_by_health_category'),
        supabase.rpc('get_farms_command_list', { p_limit: 10 })
      ]);

      if (pulseResult.error) throw pulseResult.error;
      if (categoriesResult.error) throw categoriesResult.error;
      if (listResult.error) throw listResult.error;

      setPulse(pulseResult.data);
      setHealthCategories(categoriesResult.data);
      setFarmsList(listResult.data || []);
    } catch (err: any) {
      console.error('Error loading farm command data:', err);
      setError(err.message || 'حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const assignManager = async (
    farmId: string,
    managerId: string,
    assignedBy: string,
    reason?: string
  ) => {
    try {
      const { data, error } = await supabase.rpc('assign_farm_manager', {
        p_farm_id: farmId,
        p_manager_id: managerId,
        p_assigned_by: assignedBy,
        p_reason: reason
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'فشل تعيين المدير');
      }

      await loadData();
      return { success: true, data };
    } catch (err: any) {
      console.error('Error assigning manager:', err);
      return { success: false, error: err.message };
    }
  };

  const suspendFarm = async (
    farmId: string,
    suspendedBy: string,
    reason: string
  ) => {
    try {
      const { data, error } = await supabase.rpc('suspend_farm', {
        p_farm_id: farmId,
        p_suspended_by: suspendedBy,
        p_reason: reason
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'فشل تعليق المزرعة');
      }

      await loadData();
      return { success: true, data };
    } catch (err: any) {
      console.error('Error suspending farm:', err);
      return { success: false, error: err.message };
    }
  };

  const toggleBookings = async (
    farmId: string,
    enable: boolean,
    toggledBy: string,
    reason?: string
  ) => {
    try {
      const { data, error } = await supabase.rpc('toggle_farm_bookings', {
        p_farm_id: farmId,
        p_enable: enable,
        p_toggled_by: toggledBy,
        p_reason: reason
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'فشل تغيير حالة الحجوزات');
      }

      await loadData();
      return { success: true, data };
    } catch (err: any) {
      console.error('Error toggling bookings:', err);
      return { success: false, error: err.message };
    }
  };

  const escalateExpenseDecision = async (
    farmId: string,
    expenseAmount: number,
    expenseDescription: string,
    requestedBy: string,
    priority: string = 'high'
  ) => {
    try {
      const { data, error } = await supabase.rpc('escalate_high_expense_decision', {
        p_farm_id: farmId,
        p_expense_amount: expenseAmount,
        p_expense_description: expenseDescription,
        p_requested_by: requestedBy,
        p_priority: priority
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'فشل رفع القرار');
      }

      await loadData();
      return { success: true, data };
    } catch (err: any) {
      console.error('Error escalating expense decision:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    pulse,
    healthCategories,
    farmsList,
    loading,
    error,
    refetch: loadData,
    assignManager,
    suspendFarm,
    toggleBookings,
    escalateExpenseDecision
  };
}
