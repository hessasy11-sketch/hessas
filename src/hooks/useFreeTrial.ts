import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface TrialInfo {
  hasActiveTrial: boolean;
  trialPlanType: string | null;
  trialPlanName: string | null;
  trialEndsAt: string | null;
  daysRemaining: number;
  hoursRemaining: number;
  silverTrialEligible: boolean;
  goldTrialEligible: boolean;
}

export function useFreeTrial(userId: string | undefined) {
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTrialInfo = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_trial_info', {
        p_user_id: userId
      });

      if (error) throw error;

      setTrialInfo({
        hasActiveTrial: data.has_active_trial || false,
        trialPlanType: data.trial_plan_type || null,
        trialPlanName: data.trial_plan_name || null,
        trialEndsAt: data.trial_ends_at || null,
        daysRemaining: data.days_remaining || 0,
        hoursRemaining: data.hours_remaining || 0,
        silverTrialEligible: data.silver_trial_eligible || false,
        goldTrialEligible: data.gold_trial_eligible || false
      });
    } catch (error) {
      console.error('Error fetching trial info:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrialInfo();
  }, [userId]);

  const activateFreeTrial = async (planType: 'silver' | 'gold'): Promise<{ success: boolean; message: string }> => {
    if (!userId) {
      return { success: false, message: 'يجب تسجيل الدخول أولاً' };
    }

    try {
      const { data, error } = await supabase.rpc('activate_free_trial', {
        p_user_id: userId,
        p_plan_type: planType
      });

      if (error) throw error;

      if (data.success) {
        await fetchTrialInfo();
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error: any) {
      console.error('Error activating free trial:', error);
      return { success: false, message: error.message || 'حدث خطأ أثناء تفعيل التجربة المجانية' };
    }
  };

  return {
    trialInfo,
    loading,
    activateFreeTrial,
    refreshTrialInfo: fetchTrialInfo
  };
}
