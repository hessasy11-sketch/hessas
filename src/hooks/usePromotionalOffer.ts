import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface PromotionalOffer {
  id: string;
  offer_type: string;
  offer_title: string;
  offer_description: string;
  target_plan_id: string;
  bonus_months: number;
  offer_starts_at: string;
  offer_expires_at: string;
  status: string;
  ai_message: string;
  plan_name: string;
  plan_price: string;
}

export function usePromotionalOffer(userId: string | undefined) {
  const [offer, setOffer] = useState<PromotionalOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState<number>(0);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    checkForOffer();
    const interval = setInterval(checkForOffer, 300000);
    return () => clearInterval(interval);
  }, [userId]);

  const checkForOffer = async () => {
    if (!userId) return;

    try {
      const { data: existingOffer, error: offerError } = await supabase
        .from('promotional_offers')
        .select(`
          id,
          offer_type,
          offer_title,
          offer_description,
          target_plan_id,
          bonus_months,
          offer_starts_at,
          offer_expires_at,
          status,
          ai_message,
          subscription_plans!target_plan_id (
            name,
            price
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .gt('offer_expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (offerError) throw offerError;

      if (existingOffer) {
        const plan = existingOffer.subscription_plans as any;
        setOffer({
          ...existingOffer,
          plan_name: plan?.name || '',
          plan_price: plan?.price || '0',
        });

        const days = calculateDaysRemaining(existingOffer.offer_expires_at);
        setDaysRemaining(days);
      } else {
        await createOfferIfEligible();
      }
    } catch (error) {
      console.error('Error checking promotional offer:', error);
    } finally {
      setLoading(false);
    }
  };

  const createOfferIfEligible = async () => {
    if (!userId) return;

    try {
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select(`
          id,
          plan_id,
          ends_at,
          subscription_plans!plan_id (
            id,
            name,
            price
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('ends_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!subscription) return;

      const plan = subscription.subscription_plans as any;
      const price = parseFloat(plan?.price || '0');

      if (price > 0) return;

      const hoursUntilExpiry = calculateHoursRemaining(subscription.ends_at);

      if (hoursUntilExpiry <= 48 && hoursUntilExpiry > 0) {
        const { data: silverPlan } = await supabase
          .from('subscription_plans')
          .select('id, name, price')
          .gte('price', '20')
          .order('price', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!silverPlan) return;

        const offerExpiresAt = new Date();
        offerExpiresAt.setDate(offerExpiresAt.getDate() + 7);

        const aiMessage = `🎉 عرض خاص لك!

شهر عليك وشهر علينا!

اشترك في باقة ${silverPlan.name} الآن، وبعد انتهاء أول شهر مدفوع، نهديك شهراً إضافياً مجاناً!

هذا العرض متاح لمدة 7 أيام فقط، لا تفوت الفرصة! 🌟`;

        const { error: insertError } = await supabase
          .from('promotional_offers')
          .insert({
            user_id: userId,
            offer_type: 'free_month_bonus',
            offer_title: 'شهر عليك وشهر علينا',
            offer_description: 'اشترك الآن واحصل على شهر إضافي مجاناً بعد أول دورة دفع',
            target_plan_id: silverPlan.id,
            bonus_months: 1,
            offer_starts_at: new Date().toISOString(),
            offer_expires_at: offerExpiresAt.toISOString(),
            status: 'active',
            shown_at: new Date().toISOString(),
            ai_message: aiMessage,
          });

        if (!insertError) {
          await checkForOffer();
        }
      }
    } catch (error) {
      console.error('Error creating promotional offer:', error);
    }
  };

  const calculateHoursRemaining = (endsAt: string): number => {
    const end = new Date(endsAt);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60));
  };

  const calculateDaysRemaining = (expiresAt: string): number => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const acceptOffer = async (offerId: string) => {
    try {
      const { error } = await supabase
        .from('promotional_offers')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', offerId);

      if (error) throw error;

      setOffer(null);
      return true;
    } catch (error) {
      console.error('Error accepting offer:', error);
      return false;
    }
  };

  const rejectOffer = async (offerId: string) => {
    try {
      const { error } = await supabase
        .from('promotional_offers')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
        })
        .eq('id', offerId);

      if (error) throw error;

      setOffer(null);
      return true;
    } catch (error) {
      console.error('Error rejecting offer:', error);
      return false;
    }
  };

  return {
    offer,
    loading,
    daysRemaining,
    hasActiveOffer: offer !== null,
    acceptOffer,
    rejectOffer,
    refreshOffer: checkForOffer,
  };
}
