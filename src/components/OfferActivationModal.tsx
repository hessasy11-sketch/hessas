import { useState } from 'react';
import { X, Gift, Check, Sparkles, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DynamicPlan, UserSubscriptionStatus } from '../hooks/useDynamicPlans';

interface OfferActivationModalProps {
  plan: DynamicPlan;
  offer: UserSubscriptionStatus['active_offer'];
  onClose: () => void;
  onSuccess: () => void;
}

export function OfferActivationModal({ plan, offer, onClose, onSuccess }: OfferActivationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!offer) return null;

  const handleActivateOffer = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('يجب تسجيل الدخول أولاً');
        return;
      }

      const { data, error: rpcError } = await supabase.rpc('activate_promotional_offer', {
        p_user_id: user.id,
        p_offer_id: offer.id,
        p_plan_id: plan.id,
      });

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      if (data && !data.success) {
        setError(data.error);
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = () => {
    const expiresAt = new Date(offer.expires_at).getTime();
    const now = Date.now();
    const diff = expiresAt - now;

    if (diff <= 0) return 'منتهي';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} يوم`;
    if (hours > 0) return `${hours} ساعة`;
    return 'أقل من ساعة';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl animate-in fade-in slide-in-from-bottom duration-300 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500 text-white overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-400/50 via-rose-400/50 to-pink-400/50" style={{ backgroundSize: '200% 200%', animation: 'gradient-x 3s ease infinite' }} />

          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 hover:bg-white/20 rounded-full transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center relative z-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mb-4 animate-bounce">
              <Gift className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black mb-2">
              🎁 عرض خاص حصري!
            </h2>
            <p className="text-white/90 text-lg font-bold">
              {offer.offer_title}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Offer Details */}
          <div className="bg-gradient-to-r from-pink-50 to-rose-50 border-2 border-pink-200 rounded-xl p-5">
            <div className="text-center mb-4">
              <div className="text-5xl font-black text-pink-600 mb-2">
                {offer.bonus_months + 1} شهر
              </div>
              <p className="text-sm text-pink-700">
                <span className="line-through opacity-60">سعر شهر واحد فقط</span>
                <br />
                <span className="font-bold text-lg">واحصل على {offer.bonus_months} شهر إضافي مجاناً!</span>
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-pink-900">
              <Sparkles className="w-5 h-5" />
              <p className="text-sm font-bold">
                {offer.offer_description}
              </p>
              <Sparkles className="w-5 h-5" />
            </div>
          </div>

          {/* Countdown */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-orange-700 font-medium mb-1">
                  ⏰ العرض ينتهي خلال:
                </p>
                <p className="text-2xl font-black text-orange-900">
                  {getTimeRemaining()}
                </p>
              </div>
            </div>
          </div>

          {/* Plan Features */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-600" />
              ما ستحصل عليه مع الباقة {plan.name_ar}:
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {plan.features_ar && plan.features_ar.length > 0 ? (
                plan.features_ar.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 leading-tight">{feature}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">جميع مميزات الباقة</p>
              )}
            </div>
          </div>

          {/* Price Comparison */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-emerald-700">السعر العادي:</span>
              <span className="text-lg line-through text-emerald-600">
                {(parseFloat(plan.price.toString()) * (offer.bonus_months + 1)).toFixed(0)} ر.س
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-emerald-900">سعر العرض:</span>
              <span className="text-3xl font-black text-emerald-600">
                {parseFloat(plan.price.toString()).toFixed(0)} ر.س
              </span>
            </div>
            <div className="text-center mt-3 pt-3 border-t-2 border-emerald-200">
              <p className="text-sm font-bold text-emerald-700">
                💰 توفير {((parseFloat(plan.price.toString()) * offer.bonus_months)).toFixed(0)} ر.س
              </p>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-800">
                <span className="font-bold">ملاحظة:</span> هذا العرض متاح لفترة محدودة ولا يمكن تكراره
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-700 text-center">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              لاحقاً
            </button>
            <button
              onClick={handleActivateOffer}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري التفعيل...
                </span>
              ) : (
                <>
                  🎁 احصل على العرض الآن!
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
