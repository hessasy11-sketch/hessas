import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  starts_at: string;
  ends_at: string;
  auto_renew: boolean;
  is_trial: boolean;
  trial_started_at?: string;
  trial_ends_at?: string;
  payment_status?: string;
  temporary_activation: boolean;
  bonus_months_remaining?: number;
  is_promotional: boolean;
  plan?: {
    name_ar: string;
    plan_type: 'free' | 'silver' | 'gold';
    color?: string;
    badge?: string;
  };
}

export function useUserSubscription(userId?: string) {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = async () => {
    if (!userId) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          plan:subscription_plans!plan_id(
            name_ar,
            plan_type,
            color,
            badge
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      setSubscription(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();

    if (!userId) return;

    const channel = supabase
      .channel(`subscription-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_subscriptions',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchSubscription();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const getDaysRemaining = () => {
    if (!subscription || !subscription.ends_at) return 0;
    const now = new Date();
    const endsAt = new Date(subscription.ends_at);
    const diff = endsAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const isExpiringSoon = () => {
    const days = getDaysRemaining();
    return days > 0 && days <= 7;
  };

  const getCurrentPlanType = (): 'free' | 'silver' | 'gold' => {
    if (!subscription || subscription.status !== 'active') {
      return 'free';
    }
    return subscription.plan?.plan_type || 'free';
  };

  return {
    subscription,
    loading,
    error,
    refresh: fetchSubscription,
    daysRemaining: getDaysRemaining(),
    isExpiringSoon: isExpiringSoon(),
    currentPlanType: getCurrentPlanType(),
    hasActiveSubscription: !!subscription && subscription.status === 'active',
    isTrial: subscription?.is_trial || false,
    isPromotional: subscription?.is_promotional || false
  };
}
