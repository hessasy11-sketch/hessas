import { Clock, Gift, Sparkles, AlertTriangle } from 'lucide-react';
import { UserSubscriptionStatus } from '../hooks/useDynamicPlans';

interface TrialCountdownBannerProps {
  userStatus: UserSubscriptionStatus;
  onUpgrade?: () => void;
}

export function TrialCountdownBanner({ userStatus, onUpgrade }: TrialCountdownBannerProps) {
  if (!userStatus.is_on_trial || !userStatus.days_remaining) {
    return null;
  }

  const daysRemaining = userStatus.days_remaining;
  const isExpiringSoon = daysRemaining <= 2;

  const getBannerColor = () => {
    if (daysRemaining <= 1) return 'from-red-500 to-rose-600';
    if (daysRemaining <= 2) return 'from-orange-500 to-amber-600';
    return 'from-blue-500 to-cyan-600';
  };

  const getIcon = () => {
    if (daysRemaining <= 2) return <AlertTriangle className="w-6 h-6" />;
    return <Clock className="w-6 h-6" />;
  };

  const getMessage = () => {
    if (daysRemaining === 0) {
      return 'تنتهي تجربتك المجانية اليوم!';
    }
    if (daysRemaining === 1) {
      return 'تنتهي تجربتك المجانية غداً';
    }
    return `${daysRemaining} يوم متبقي على انتهاء التجربة المجانية`;
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${getBannerColor()} text-white p-6 shadow-lg`}
    >
      <div className="absolute top-0 left-0 w-full h-full opacity-10">
        <div className="absolute top-4 right-4 w-32 h-32 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-4 left-4 w-40 h-40 bg-white rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-shrink-0 w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                {getIcon()}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Gift className="w-4 h-4" />
                  <span className="text-sm font-bold">تجربة مجانية</span>
                </div>
                <h3 className="text-xl font-black">
                  {getMessage()}
                </h3>
              </div>
            </div>

            <p className="text-white/90 text-sm mb-4 leading-relaxed">
              {isExpiringSoon
                ? 'اشترك الآن للاستمرار في الاستفادة من جميع المميزات'
                : 'استمتع بجميع مميزات الباقة خلال فترة التجربة المجانية'}
            </p>

            {userStatus.has_active_offer && userStatus.active_offer && isExpiringSoon && (
              <div className="flex items-start gap-2 p-3 bg-white/10 backdrop-blur-md rounded-xl mb-4 border border-white/20">
                <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5 animate-pulse" />
                <div className="text-sm">
                  <p className="font-bold mb-0.5">{userStatus.active_offer.offer_title}</p>
                  <p className="text-white/80 text-xs">{userStatus.active_offer.offer_description}</p>
                </div>
              </div>
            )}

            {isExpiringSoon && onUpgrade && (
              <button
                onClick={onUpgrade}
                className="w-full sm:w-auto px-6 py-3 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl"
              >
                اشترك الآن
              </button>
            )}
          </div>

          <div className="hidden sm:flex flex-col items-center justify-center p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 min-w-[100px]">
            <div className="text-5xl font-black mb-1">{daysRemaining}</div>
            <div className="text-xs text-white/80">
              {daysRemaining === 1 ? 'يوم' : daysRemaining === 2 ? 'يومان' : 'أيام'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
