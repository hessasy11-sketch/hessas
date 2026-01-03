import { Check, Crown, Star, Zap, Clock, Gift, Sparkles } from 'lucide-react';
import { DynamicPlan, UserSubscriptionStatus } from '../hooks/useDynamicPlans';

interface DynamicPlanCardProps {
  plan: DynamicPlan;
  userStatus: UserSubscriptionStatus | null;
  onSelect: (planId: string) => void;
  isCompact?: boolean;
}

export function DynamicPlanCard({ plan, userStatus, onSelect, isCompact = false }: DynamicPlanCardProps) {
  const isCurrentPlan = userStatus?.current_plan_type === plan.plan_type;
  const canUpgrade = userStatus?.can_upgrade && plan.plan_type !== 'free' && !isCurrentPlan;
  const canStartTrial = plan.has_free_trial && !userStatus?.is_on_trial && !isCurrentPlan && userStatus?.current_plan_type === 'free';

  const getPlanIcon = () => {
    switch (plan.plan_type) {
      case 'gold':
        return <Crown className="w-5 h-5" />;
      case 'silver':
        return <Star className="w-5 h-5" />;
      default:
        return <Zap className="w-5 h-5" />;
    }
  };

  const getButtonText = () => {
    if (isCurrentPlan) {
      if (userStatus?.is_on_trial) {
        return `تجربة مجانية (${userStatus.days_remaining} يوم)`;
      }
      if (userStatus?.days_remaining && userStatus.days_remaining > 0) {
        return `نشط (${userStatus.days_remaining} يوم)`;
      }
      return 'الباقة الحالية';
    }

    if (canStartTrial) {
      return 'جرب مجاناً';
    }

    if (canUpgrade) {
      return userStatus?.current_plan_type === 'free' ? 'اشترك' : 'ترقية';
    }

    if (plan.plan_type === 'free') {
      return 'مجاناً';
    }

    return 'التفاصيل';
  };

  const lightenColor = (hex: string, percent: number) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
  };

  const darkenColor = (hex: string, percent: number) => {
    return lightenColor(hex, -percent);
  };

  if (isCompact) {
    return (
      <button
        onClick={() => onSelect(plan.id)}
        disabled={isCurrentPlan && plan.plan_type === 'gold'}
        className={`relative w-full rounded-2xl overflow-hidden group transition-all duration-500 ${
          isCurrentPlan
            ? 'shadow-2xl scale-[1.03]'
            : 'shadow-lg hover:shadow-2xl hover:scale-[1.05]'
        }`}
        style={{
          transform: 'translateZ(0)',
          willChange: 'transform',
        }}
      >
        {/* 3D Border Frame - Top & Bottom */}
        <div
          className="absolute top-0 left-0 right-0 h-1 transition-all duration-300 group-hover:h-1.5"
          style={{
            background: `linear-gradient(90deg, ${darkenColor(plan.color, 20)} 0%, ${plan.color} 50%, ${darkenColor(plan.color, 20)} 100%)`,
            boxShadow: `0 2px 8px ${plan.color}40`
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-1 transition-all duration-300 group-hover:h-1.5"
          style={{
            background: `linear-gradient(90deg, ${darkenColor(plan.color, 20)} 0%, ${plan.color} 50%, ${darkenColor(plan.color, 20)} 100%)`,
            boxShadow: `0 -2px 8px ${plan.color}40`
          }}
        />

        {/* 3D Border Frame - Left & Right */}
        <div
          className="absolute top-0 bottom-0 left-0 w-1 transition-all duration-300 group-hover:w-1.5"
          style={{
            background: `linear-gradient(180deg, ${darkenColor(plan.color, 20)} 0%, ${plan.color} 50%, ${darkenColor(plan.color, 20)} 100%)`,
            boxShadow: `2px 0 8px ${plan.color}40`
          }}
        />
        <div
          className="absolute top-0 bottom-0 right-0 w-1 transition-all duration-300 group-hover:w-1.5"
          style={{
            background: `linear-gradient(180deg, ${darkenColor(plan.color, 20)} 0%, ${plan.color} 50%, ${darkenColor(plan.color, 20)} 100%)`,
            boxShadow: `-2px 0 8px ${plan.color}40`
          }}
        />

        {/* Corner Accent Lights */}
        <div
          className="absolute top-0 right-0 w-12 h-12 opacity-20 group-hover:opacity-40 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at top right, ${plan.color}, transparent 70%)`,
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-12 h-12 opacity-20 group-hover:opacity-40 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at bottom left, ${plan.color}, transparent 70%)`,
          }}
        />

        {/* Background Gradient with 3D effect */}
        <div
          className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${plan.color} 0%, ${lightenColor(plan.color, 30)} 50%, ${plan.color} 100%)`,
          }}
        />

        {/* Animated Border Glow */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            boxShadow: `inset 0 0 20px ${plan.color}30, 0 0 20px ${plan.color}20`,
            pointerEvents: 'none'
          }}
        />

        {/* Decorative animated circles */}
        <div
          className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-5 group-hover:opacity-10 transition-all duration-500 group-hover:scale-110"
          style={{
            backgroundColor: plan.color,
            filter: 'blur(8px)'
          }}
        />
        <div
          className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full opacity-5 group-hover:opacity-10 transition-all duration-500 group-hover:scale-110"
          style={{
            backgroundColor: plan.color,
            filter: 'blur(8px)'
          }}
        />

        <div className="relative bg-white/98 backdrop-blur-sm p-3.5 transition-all duration-300 group-active:scale-95">
          {/* Badge & Current Plan Indicator */}
          <div className="flex items-center justify-between mb-2.5">
            {plan.badge && (
              <div
                className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white shadow-lg animate-pulse"
                style={{
                  backgroundColor: plan.color,
                  boxShadow: `0 4px 12px ${plan.color}50`
                }}
              >
                {plan.badge}
              </div>
            )}
            {isCurrentPlan && (
              <div
                className="px-2.5 py-1 rounded-full flex items-center gap-1 text-white text-[10px] font-bold shadow-lg"
                style={{
                  backgroundColor: plan.color,
                  boxShadow: `0 4px 12px ${plan.color}50`
                }}
              >
                <Check className="w-3 h-3" />
                <span>نشط</span>
              </div>
            )}
          </div>

          {/* Icon & Title with 3D effect */}
          <div className="flex items-center gap-2.5 mb-2.5">
            <div
              className="p-2.5 rounded-xl text-white shadow-xl relative overflow-hidden group/icon transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
              style={{
                backgroundColor: plan.color,
                boxShadow: `0 8px 20px ${plan.color}50, inset 0 2px 4px rgba(255,255,255,0.3)`
              }}
            >
              <div
                className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-0 group-hover/icon:opacity-100 transition-opacity"
              />
              <div className="relative z-10">
                {getPlanIcon()}
              </div>
            </div>
            <div className="flex-1 text-right">
              <h4 className="font-black text-sm text-gray-800 leading-tight group-hover:text-gray-900 transition-colors">
                {plan.name_ar}
              </h4>
            </div>
          </div>

          {/* Price with Glow */}
          <div className="flex items-baseline justify-center gap-1 mb-2.5 group-hover:scale-105 transition-transform duration-300">
            <span
              className="text-2xl font-black transition-all duration-300"
              style={{
                color: plan.color,
                textShadow: `0 2px 10px ${plan.color}30`
              }}
            >
              {plan.price === 0 ? 'مجاناً' : parseFloat(plan.price.toString()).toFixed(0)}
            </span>
            {plan.price > 0 && (
              <>
                <span className="text-xs font-bold text-gray-500">ر.س</span>
                <span className="text-[10px] text-gray-400">
                  / {plan.duration_days === 30 ? 'شهر' : plan.duration_days === 365 ? 'سنة' : `${plan.duration_days}ي`}
                </span>
              </>
            )}
          </div>

          {/* Trial Badge with 3D */}
          {canStartTrial && (
            <div className="mb-2.5 p-2 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-blue-700 font-bold">
                <Gift className="w-3.5 h-3.5" />
                <span>{plan.free_trial_days} يوم تجربة</span>
              </div>
            </div>
          )}

          {/* Offer Badge with 3D */}
          {userStatus?.has_active_offer && plan.plan_type !== 'free' && !isCurrentPlan && (
            <div className="mb-2.5 p-2 bg-gradient-to-r from-pink-50 to-rose-50 border-2 border-pink-300 rounded-xl shadow-md animate-pulse">
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-pink-700 font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>عرض خاص</span>
              </div>
            </div>
          )}

          {/* Action Button with 3D effect */}
          <div
            className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold text-white shadow-xl transition-all duration-300 relative overflow-hidden ${
              isCurrentPlan && plan.plan_type === 'gold'
                ? 'opacity-60 cursor-not-allowed'
                : 'hover:shadow-2xl active:scale-95 hover:-translate-y-0.5'
            }`}
            style={{
              background: isCurrentPlan && plan.plan_type === 'gold'
                ? '#9ca3af'
                : `linear-gradient(135deg, ${plan.color} 0%, ${lightenColor(plan.color, -15)} 100%)`,
              boxShadow: `0 8px 20px ${plan.color}40, inset 0 1px 2px rgba(255,255,255,0.3)`
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-white/10" />
            <span className="relative z-10">{getButtonText()}</span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => onSelect(plan.id)}
      disabled={isCurrentPlan && plan.plan_type === 'gold'}
      className={`relative w-full rounded-3xl overflow-hidden group transition-all duration-500 ${
        isCurrentPlan
          ? 'shadow-2xl scale-[1.03]'
          : 'shadow-xl hover:shadow-2xl hover:scale-[1.05]'
      }`}
      style={{
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
    >
      {/* 3D Border Frame - Top & Bottom */}
      <div
        className="absolute top-0 left-0 right-0 h-2 transition-all duration-300 group-hover:h-3"
        style={{
          background: `linear-gradient(90deg, ${darkenColor(plan.color, 20)} 0%, ${plan.color} 50%, ${darkenColor(plan.color, 20)} 100%)`,
          boxShadow: `0 4px 15px ${plan.color}50`
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-2 transition-all duration-300 group-hover:h-3"
        style={{
          background: `linear-gradient(90deg, ${darkenColor(plan.color, 20)} 0%, ${plan.color} 50%, ${darkenColor(plan.color, 20)} 100%)`,
          boxShadow: `0 -4px 15px ${plan.color}50`
        }}
      />

      {/* 3D Border Frame - Left & Right */}
      <div
        className="absolute top-0 bottom-0 left-0 w-2 transition-all duration-300 group-hover:w-3"
        style={{
          background: `linear-gradient(180deg, ${darkenColor(plan.color, 20)} 0%, ${plan.color} 50%, ${darkenColor(plan.color, 20)} 100%)`,
          boxShadow: `4px 0 15px ${plan.color}50`
        }}
      />
      <div
        className="absolute top-0 bottom-0 right-0 w-2 transition-all duration-300 group-hover:w-3"
        style={{
          background: `linear-gradient(180deg, ${darkenColor(plan.color, 20)} 0%, ${plan.color} 50%, ${darkenColor(plan.color, 20)} 100%)`,
          boxShadow: `-4px 0 15px ${plan.color}50`
        }}
      />

      {/* Corner Accent Lights */}
      <div
        className="absolute top-0 right-0 w-20 h-20 opacity-20 group-hover:opacity-40 transition-all duration-500"
        style={{
          background: `radial-gradient(circle at top right, ${plan.color}, transparent 70%)`,
        }}
      />
      <div
        className="absolute top-0 left-0 w-20 h-20 opacity-20 group-hover:opacity-40 transition-all duration-500"
        style={{
          background: `radial-gradient(circle at top left, ${plan.color}, transparent 70%)`,
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-20 h-20 opacity-20 group-hover:opacity-40 transition-all duration-500"
        style={{
          background: `radial-gradient(circle at bottom right, ${plan.color}, transparent 70%)`,
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-20 h-20 opacity-20 group-hover:opacity-40 transition-all duration-500"
        style={{
          background: `radial-gradient(circle at bottom left, ${plan.color}, transparent 70%)`,
        }}
      />

      {/* Background with depth */}
      <div
        className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-all duration-500"
        style={{
          background: `linear-gradient(135deg, ${plan.color} 0%, ${lightenColor(plan.color, 40)} 50%, ${plan.color} 100%)`,
        }}
      />

      {/* Animated glow border */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          boxShadow: `inset 0 0 30px ${plan.color}40, 0 0 30px ${plan.color}30`,
          pointerEvents: 'none'
        }}
      />

      {/* Decorative elements */}
      <div
        className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-5 group-hover:opacity-10 transition-all duration-700 group-hover:scale-125"
        style={{
          backgroundColor: plan.color,
          filter: 'blur(20px)'
        }}
      />
      <div
        className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full opacity-5 group-hover:opacity-10 transition-all duration-700 group-hover:scale-125"
        style={{
          backgroundColor: plan.color,
          filter: 'blur(20px)'
        }}
      />

      <div className="relative bg-white/98 backdrop-blur-sm p-6 transition-all duration-300 group-active:scale-95">
        {/* Badge & Status */}
        <div className="flex items-center justify-between mb-4">
          {plan.badge && (
            <div
              className="px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-2xl animate-pulse"
              style={{
                backgroundColor: plan.color,
                boxShadow: `0 6px 20px ${plan.color}60`
              }}
            >
              {plan.badge}
            </div>
          )}
          {isCurrentPlan && (
            <div
              className="px-4 py-1.5 rounded-full flex items-center gap-2 text-white text-xs font-bold shadow-2xl"
              style={{
                backgroundColor: plan.color,
                boxShadow: `0 6px 20px ${plan.color}60`
              }}
            >
              <Check className="w-4 h-4" />
              <span>باقتك الحالية</span>
            </div>
          )}
        </div>

        {/* Icon & Title */}
        <div className="flex items-center gap-4 mb-5">
          <div
            className="p-4 rounded-2xl text-white shadow-2xl relative overflow-hidden group/icon transition-all duration-300 group-hover:scale-110 group-hover:rotate-6"
            style={{
              backgroundColor: plan.color,
              boxShadow: `0 10px 30px ${plan.color}60, inset 0 2px 8px rgba(255,255,255,0.3)`
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-0 group-hover/icon:opacity-100 transition-opacity" />
            <div className="relative z-10">
              {getPlanIcon()}
            </div>
          </div>
          <div className="flex-1 text-right">
            <h3 className="font-black text-xl text-gray-800 leading-tight mb-1 group-hover:text-gray-900 transition-colors">
              {plan.name_ar}
            </h3>
            {plan.description_ar && (
              <p className="text-xs text-gray-500 leading-tight">{plan.description_ar}</p>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="flex items-baseline justify-center gap-2 mb-5 group-hover:scale-110 transition-transform duration-300">
          <span
            className="text-5xl font-black transition-all duration-300"
            style={{
              color: plan.color,
              textShadow: `0 4px 20px ${plan.color}40`
            }}
          >
            {plan.price === 0 ? 'مجاناً' : parseFloat(plan.price.toString()).toFixed(0)}
          </span>
          {plan.price > 0 && (
            <>
              <span className="text-xl font-bold text-gray-500">ر.س</span>
              <span className="text-sm text-gray-400">
                / {plan.duration_days === 30 ? 'شهر' : plan.duration_days === 365 ? 'سنة' : `${plan.duration_days} يوم`}
              </span>
            </>
          )}
        </div>

        {/* Trial Notice */}
        {canStartTrial && (
          <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-2 text-sm text-blue-700 font-bold">
              <Gift className="w-5 h-5" />
              <span>تجربة مجانية {plan.free_trial_days} يوم</span>
            </div>
          </div>
        )}

        {/* Offer Notice */}
        {userStatus?.has_active_offer && plan.plan_type !== 'free' && !isCurrentPlan && (
          <div className="mb-4 p-4 bg-gradient-to-r from-pink-50 to-rose-50 border-2 border-pink-300 rounded-2xl shadow-lg animate-pulse">
            <div className="flex items-center gap-2 text-sm text-pink-700 font-bold mb-1">
              <Sparkles className="w-5 h-5" />
              <span>{userStatus.active_offer?.offer_title}</span>
            </div>
            {userStatus.active_offer?.offer_description && (
              <p className="text-xs text-pink-600">{userStatus.active_offer.offer_description}</p>
            )}
          </div>
        )}

        {/* Features */}
        <div className="space-y-2.5 mb-5">
          {plan.features_ar && plan.features_ar.slice(0, 3).map((feature, index) => (
            <div key={index} className="flex items-start gap-2.5 group/feature">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md group-hover/feature:scale-110 transition-transform"
                style={{
                  backgroundColor: lightenColor(plan.color, 40),
                  boxShadow: `0 2px 8px ${plan.color}30`
                }}
              >
                <Check className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm text-gray-700 leading-tight">{feature}</span>
            </div>
          ))}
          {plan.features_ar && plan.features_ar.length > 3 && (
            <p className="text-xs text-gray-400 text-center pt-2">+ {plan.features_ar.length - 3} مميزات أخرى</p>
          )}
        </div>

        {/* Action Button */}
        <div
          className={`w-full py-4 px-5 rounded-2xl text-base font-bold text-white shadow-2xl transition-all duration-300 relative overflow-hidden ${
            isCurrentPlan && plan.plan_type === 'gold'
              ? 'opacity-60 cursor-not-allowed'
              : 'hover:shadow-2xl active:scale-95 hover:-translate-y-1'
          }`}
          style={{
            background: isCurrentPlan && plan.plan_type === 'gold'
              ? '#9ca3af'
              : `linear-gradient(135deg, ${plan.color} 0%, ${darkenColor(plan.color, 15)} 100%)`,
            boxShadow: `0 10px 30px ${plan.color}50, inset 0 2px 4px rgba(255,255,255,0.3)`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-white/10" />
          <span className="relative z-10">{getButtonText()}</span>
        </div>

        {/* Days Remaining */}
        {isCurrentPlan && userStatus?.days_remaining && userStatus.days_remaining > 0 && (
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              {userStatus.is_on_trial ? 'ينتهي الاختبار' : 'تنتهي الباقة'} بعد{' '}
              <span className="font-bold" style={{ color: plan.color }}>
                {userStatus.days_remaining} يوم
              </span>
            </p>
          </div>
        )}
      </div>
    </button>
  );
}
