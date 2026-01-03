import { ArrowRight, Check, Clock, Gift, Crown, Star, Zap, Sparkles } from 'lucide-react';
import { DynamicPlan, UserSubscriptionStatus } from '../hooks/useDynamicPlans';
import { useState } from 'react';
import { FreeTrialActivationModal } from './FreeTrialActivationModal';
import { SubscriptionActivationModal } from './SubscriptionActivationModal';

interface PlanDetailsViewProps {
  plan: DynamicPlan;
  userStatus: UserSubscriptionStatus | null;
  onBack: () => void;
}

export function PlanDetailsView({ plan, userStatus, onBack }: PlanDetailsViewProps) {
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const isCurrentPlan = userStatus?.current_plan_type === plan.plan_type;
  const canUpgrade = userStatus?.can_upgrade && plan.plan_type !== 'free' && !isCurrentPlan;
  const canStartTrial = plan.has_free_trial && !userStatus?.is_on_trial && !isCurrentPlan && userStatus?.current_plan_type === 'free';

  const getPlanIcon = () => {
    switch (plan.plan_type) {
      case 'gold':
        return <Crown className="w-12 h-12" />;
      case 'silver':
        return <Star className="w-12 h-12" />;
      default:
        return <Zap className="w-12 h-12" />;
    }
  };

  const handleActionClick = () => {
    if (isCurrentPlan) return;

    if (canStartTrial) {
      setShowTrialModal(true);
    } else if (canUpgrade) {
      setShowSubscriptionModal(true);
    }
  };

  const getButtonText = () => {
    if (isCurrentPlan) {
      if (userStatus?.is_on_trial) {
        return `تجربة مجانية (${userStatus.days_remaining} يوم متبقي)`;
      }
      if (userStatus?.days_remaining && userStatus.days_remaining > 0) {
        return `نشط (${userStatus.days_remaining} يوم متبقي)`;
      }
      return 'الباقة الحالية';
    }

    if (canStartTrial) {
      return `ابدأ تجربتك المجانية (${plan.free_trial_days} يوم)`;
    }

    if (canUpgrade) {
      return userStatus?.current_plan_type === 'free' ? 'اشترك الآن' : 'ترقية الباقة';
    }

    if (plan.plan_type === 'free') {
      return 'باقة مجانية';
    }

    return 'التفاصيل';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowRight className="w-5 h-5" />
          <span className="font-medium">رجوع</span>
        </button>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div
            className="relative px-8 py-12 text-white"
            style={{
              background: `linear-gradient(135deg, ${plan.color}, ${plan.color}dd)`,
            }}
          >
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
              <div className="absolute top-10 right-10 w-32 h-32 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl" />
            </div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-white">{getPlanIcon()}</div>
                    <h1 className="text-4xl font-black">{plan.name_ar}</h1>
                  </div>
                  {plan.badge && (
                    <span className="inline-block bg-white/20 backdrop-blur-md px-4 py-1 rounded-full text-sm font-bold">
                      {plan.badge}
                    </span>
                  )}
                </div>

                {isCurrentPlan && (
                  <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-sm font-bold">الباقة الحالية</span>
                  </div>
                )}
              </div>

              <p className="text-xl text-white/90 mb-8 leading-relaxed">
                {plan.description_ar}
              </p>

              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black">{plan.price}</span>
                <div className="text-xl">
                  <div className="font-bold">ر.س</div>
                  <div className="text-white/80 text-sm">
                    {plan.duration_days} يوم
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8">
            {canStartTrial && (
              <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <Gift className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      تجربة مجانية لمدة {plan.free_trial_days} يوم
                    </h3>
                    <p className="text-gray-600 text-sm">
                      جرب جميع مميزات الباقة مجاناً لمدة {plan.free_trial_days} يوم بدون الحاجة لبطاقة ائتمانية
                    </p>
                  </div>
                </div>
              </div>
            )}

            {userStatus?.has_active_offer && userStatus.active_offer && canUpgrade && (
              <div className="mb-8 p-6 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-2xl">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center animate-pulse">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {userStatus.active_offer.offer_title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      {userStatus.active_offer.offer_description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-yellow-700">
                      <Clock className="w-4 h-4" />
                      <span>
                        ينتهي العرض في: {new Date(userStatus.active_offer.expires_at).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Check className="w-6 h-6 text-green-500" />
                <span>مميزات الباقة</span>
              </h2>

              <div className="grid gap-4">
                {plan.features_ar.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-700 leading-relaxed">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleActionClick}
              disabled={isCurrentPlan && !canStartTrial && !canUpgrade}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
                isCurrentPlan
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : canStartTrial
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]'
                  : canUpgrade
                  ? `text-white hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]`
                  : 'bg-gray-300 text-gray-600 cursor-not-allowed'
              }`}
              style={
                canUpgrade && !canStartTrial
                  ? {
                      background: `linear-gradient(135deg, ${plan.color}, ${plan.color}dd)`,
                    }
                  : undefined
              }
            >
              {getButtonText()}
            </button>
          </div>
        </div>
      </div>

      {showTrialModal && (
        <FreeTrialActivationModal
          isOpen={showTrialModal}
          onClose={() => setShowTrialModal(false)}
          planId={plan.id}
          planName={plan.name_ar}
          trialDays={plan.free_trial_days}
        />
      )}

      {showSubscriptionModal && (
        <SubscriptionActivationModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          planId={plan.id}
          planName={plan.name_ar}
          price={plan.price}
          durationDays={plan.duration_days}
        />
      )}
    </div>
  );
}
