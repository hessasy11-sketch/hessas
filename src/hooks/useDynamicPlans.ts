import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface DynamicPlan {
  id: string;
  name: string;
  name_ar: string;
  description: string | null;
  description_ar: string | null;
  price: number;
  duration_days: number;
  features: any[];
  features_ar: string[];
  is_active: boolean;
  display_order: number;
  plan_type: 'free' | 'silver' | 'gold';
  badge: string;
  color: string;
  has_free_trial: boolean;
  free_trial_days: number;
  created_at: string;
}

export interface UserSubscriptionStatus {
  current_plan_type: 'free' | 'silver' | 'gold';
  plan_id: string | null;
  is_on_trial: boolean;
  days_remaining: number | null;
  expires_at: string | null;
  can_upgrade: boolean;
  has_active_offer: boolean;
  active_offer?: {
    id: string;
    offer_title: string;
    offer_description: string;
    bonus_months: number;
    expires_at: string;
  };
}

export function useDynamicPlans() {
  const [plans, setPlans] = useState<DynamicPlan[]>([]);
  const [userStatus, setUserStatus] = useState<UserSubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
    loadUserStatus();

    const plansChannel = supabase
      .channel('plans-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscription_plans' },
        () => {
          loadPlans();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Plans realtime connected');
        }
      });

    const userSubChannel = supabase
      .channel('user-subscription-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_subscriptions' },
        () => {
          loadUserStatus();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ User subscription realtime connected');
        }
      });

    const refreshInterval = setInterval(() => {
      loadPlans();
      loadUserStatus();
    }, 30000);

    return () => {
      clearInterval(refreshInterval);
      supabase.removeChannel(plansChannel);
      supabase.removeChannel(userSubChannel);
    };
  }, []);

  const loadPlans = async (retryCount = 0) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (fetchError) {
        if (retryCount < 2) {
          console.log(`Retrying plans load ${retryCount + 1}/2...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return loadPlans(retryCount + 1);
        }
        throw fetchError;
      }

      setPlans(data || []);
      setError(null);
    } catch (err: any) {
      const errorMessage = err?.message || 'فشل تحميل الباقات';
      setError(errorMessage);
      console.error('Error loading plans:', {
        message: errorMessage,
        details: err?.details,
        hint: err?.hint,
        code: err?.code
      });
    }
  };

  const loadUserStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setUserStatus({
          current_plan_type: 'free',
          plan_id: null,
          is_on_trial: false,
          days_remaining: null,
          expires_at: null,
          can_upgrade: true,
          has_active_offer: false,
        });
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('current_plan_type')
        .eq('id', user.id)
        .single();

      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: activeOffer } = await supabase
        .from('promotional_offers')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .gte('offer_expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let daysRemaining = null;
      if (subscription?.expires_at) {
        const expiresAt = new Date(subscription.expires_at).getTime();
        const now = new Date().getTime();
        daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
      }

      const currentPlanType = profile?.current_plan_type || 'free';

      setUserStatus({
        current_plan_type: currentPlanType,
        plan_id: subscription?.plan_id || null,
        is_on_trial: subscription?.is_trial || false,
        days_remaining: daysRemaining,
        expires_at: subscription?.expires_at || null,
        can_upgrade: currentPlanType !== 'gold',
        has_active_offer: !!activeOffer,
        active_offer: activeOffer ? {
          id: activeOffer.id,
          offer_title: activeOffer.offer_title,
          offer_description: activeOffer.offer_description,
          bonus_months: activeOffer.bonus_months,
          expires_at: activeOffer.offer_expires_at,
        } : undefined,
      });

      setLoading(false);
    } catch (err) {
      console.error('Error loading user status:', err);
      setUserStatus({
        current_plan_type: 'free',
        plan_id: null,
        is_on_trial: false,
        days_remaining: null,
        expires_at: null,
        can_upgrade: true,
        has_active_offer: false,
      });
      setLoading(false);
    }
  };

  const getPlanByType = (planType: 'free' | 'silver' | 'gold') => {
    return plans.find(p => p.plan_type === planType);
  };

  const getUpgradePath = () => {
    if (!userStatus) return [];

    if (userStatus.current_plan_type === 'free') {
      return plans.filter(p => p.plan_type === 'silver' || p.plan_type === 'gold');
    }

    if (userStatus.current_plan_type === 'silver') {
      return plans.filter(p => p.plan_type === 'gold');
    }

    return [];
  };

  return {
    plans,
    userStatus,
    loading,
    error,
    getPlanByType,
    getUpgradePath,
    refresh: () => {
      loadPlans();
      loadUserStatus();
    },
  };
}
