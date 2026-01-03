import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  subscriptionType: 'free' | 'silver' | 'gold';
  endDate: string | null;
  loading: boolean;
}

export function useRealtimeSubscription(userId: string | undefined) {
  const [status, setStatus] = useState<SubscriptionStatus>({
    hasActiveSubscription: false,
    subscriptionType: 'free',
    endDate: null,
    loading: true,
  });

  useEffect(() => {
    if (!userId) {
      setStatus({
        hasActiveSubscription: false,
        subscriptionType: 'free',
        endDate: null,
        loading: false,
      });
      return;
    }

    loadSubscriptionStatus();

    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_subscriptions',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadSubscriptionStatus();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscription_requests',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadSubscriptionStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadSubscriptionStatus = async () => {
    if (!userId) return;

    try {
      const { data: activeSubscription } = await supabase
        .from('user_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .gt('ends_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeSubscription && activeSubscription.subscription_plans) {
        const planType = activeSubscription.subscription_plans.plan_type ||
                        (activeSubscription.subscription_plans.name?.toLowerCase() === 'golden' ? 'gold' :
                         activeSubscription.subscription_plans.name?.toLowerCase() === 'agricultural' ? 'silver' : 'free');

        setStatus({
          hasActiveSubscription: true,
          subscriptionType: planType as 'free' | 'silver' | 'gold',
          endDate: activeSubscription.ends_at,
          loading: false,
        });
      } else {
        setStatus({
          hasActiveSubscription: false,
          subscriptionType: 'free',
          endDate: null,
          loading: false,
        });
      }
    } catch (error) {
      console.error('Error loading subscription status:', error);
      setStatus(prev => ({ ...prev, loading: false }));
    }
  };

  return { ...status, refresh: loadSubscriptionStatus };
}
