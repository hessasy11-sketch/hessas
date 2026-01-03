import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  features: any;
}

interface ActiveSubscription {
  id: string;
  plan_id: string;
  status: string;
  ends_at: string;
  subscription_plans: SubscriptionPlan;
}

export function useSubscriptionFeatures() {
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [planPrice, setPlanPrice] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState<any>({});

  useEffect(() => {
    checkSubscription();
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, []);

  const checkSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setToFreeFeatures();
        return;
      }

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          id,
          plan_id,
          status,
          ends_at,
          subscription_plans (
            id,
            name,
            price,
            features
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gt('ends_at', new Date().toISOString())
        .order('ends_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data && data.subscription_plans) {
        const sub = data as ActiveSubscription;
        const plan = sub.subscription_plans;
        const price = parseFloat(plan.price);

        setHasActiveSubscription(price > 0);
        setCurrentPlan(plan.name);
        setPlanPrice(price);
        setFeatures(plan.features || {});
      } else {
        setToFreeFeatures();
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setToFreeFeatures();
    } finally {
      setLoading(false);
    }
  };

  const setToFreeFeatures = () => {
    setHasActiveSubscription(false);
    setCurrentPlan('المجانية');
    setPlanPrice(0);
    setFeatures({
      max_auctions_per_month: 5,
      max_images_per_auction: 3,
      auction_duration_days: 7,
      can_extend_auction: false,
      can_repost_auction: false,
      smart_assistant: false,
      advanced_analytics: false,
      priority_support: false,
      custom_branding: false,
      unlimited_listings: false,
    });
  };

  const hasFeature = (feature: string): boolean => {
    if (planPrice === 0) {
      return false;
    }
    return features[feature] === true;
  };

  const canExtendAuction = (): boolean => hasFeature('can_extend_auction');
  const canRepostAuction = (): boolean => hasFeature('can_repost_auction');
  const canUseSmartAssistant = (): boolean => hasFeature('smart_assistant');
  const canViewAnalytics = (): boolean => hasFeature('advanced_analytics');
  const hasPrioritySupport = (): boolean => hasFeature('priority_support');
  const hasCustomBranding = (): boolean => hasFeature('custom_branding');
  const hasUnlimitedListings = (): boolean => hasFeature('unlimited_listings');

  const isPremiumUser = (): boolean => {
    return hasActiveSubscription && planPrice > 0;
  };

  const isSilverOrHigher = (): boolean => {
    return planPrice >= 20;
  };

  const isGoldUser = (): boolean => {
    return planPrice >= 49;
  };

  return {
    hasActiveSubscription,
    currentPlan,
    planPrice,
    loading,
    features,
    hasFeature,
    canExtendAuction,
    canRepostAuction,
    canUseSmartAssistant,
    canViewAnalytics,
    hasPrioritySupport,
    hasCustomBranding,
    hasUnlimitedListings,
    isPremiumUser,
    isSilverOrHigher,
    isGoldUser,
    refreshSubscription: checkSubscription,
  };
}
