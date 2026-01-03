import { AlertCircle, X, Sparkles, Clock } from 'lucide-react';
import { UserSubscriptionStatus } from '../hooks/useDynamicPlans';

interface TrialExpiryNotificationProps {
  userStatus: UserSubscriptionStatus;
  onClose: () => void;
  onUpgrade: () => void;
}

export function TrialExpiryNotification({
  userStatus,
  onClose,
  onUpgrade
}: TrialExpiryNotificationProps) {
  if (!userStatus.is_on_trial || !userStatus.days_remaining) {
    return null;
  }

  const daysRemaining = userStatus.days_remaining;

  if (daysRemaining > 2) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-2xl shadow-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-4 right-4 w-24 h-24 bg-white rounded-full blur-2xl" />
        </div>

        <button
          onClick={onClose}
          className="absolute top-3 left-3 p-1.5 hover:bg-white/20 rounded-full transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative z-10">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-shrink-0 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-lg mb-1">
                {daysRemaining === 0
                  ? 'تنتهي تجربتك اليوم!'
                  : daysRemaining === 1
                  ? 'تنتهي تجربتك غداً!'
                  : `${daysRemaining} يوم متبقي!`}
              </h3>
              <p className="text-white/90 text-sm">
                اشترك الآن للاستمرار في الاستفادة من جميع المميزات
              </p>
            </div>
          </div>

          {userStatus.has_active_offer && userStatus.active_offer && (
            <div className="flex items-start gap-2 p-3 bg-white/10 backdrop-blur-md rounded-xl mb-4 border border-white/20">
              <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5 animate-pulse" />
              <div className="text-sm">
                <p className="font-bold mb-0.5">{userStatus.active_offer.offer_title}</p>
                <p className="text-white/80 text-xs">{userStatus.active_offer.offer_description}</p>
                <div className="flex items-center gap-1 mt-1 text-xs">
                  <Clock className="w-3 h-3" />
                  <span>
                    ينتهي: {new Date(userStatus.active_offer.expires_at).toLocaleDateString('ar-SA')}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-white/10 hover:bg-white/20 backdrop-blur-md font-bold text-sm rounded-xl transition-colors border border-white/20"
            >
              لاحقاً
            </button>
            <button
              onClick={onUpgrade}
              className="flex-1 py-2.5 px-4 bg-white text-gray-900 hover:bg-gray-100 font-bold text-sm rounded-xl transition-colors shadow-lg"
            >
              اشترك الآن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
