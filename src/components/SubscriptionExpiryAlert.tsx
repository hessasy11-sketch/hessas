import { useEffect, useState } from 'react';
import { AlertTriangle, Bell, X, Clock, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Subscription {
  id: string;
  ends_at: string;
  plan_id: string;
  plan_name: string;
  plan_price: string;
  reminder_48h_sent: boolean;
  reminder_24h_sent: boolean;
}

interface SubscriptionExpiryAlertProps {
  userId: string;
}

export function SubscriptionExpiryAlert({ userId }: SubscriptionExpiryAlertProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [hoursRemaining, setHoursRemaining] = useState<number>(0);
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState<'48h' | '24h' | null>(null);
  const [showAIMessage, setShowAIMessage] = useState(false);

  useEffect(() => {
    checkSubscription();
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [userId]);

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          id,
          ends_at,
          plan_id,
          reminder_48h_sent,
          reminder_24h_sent,
          subscription_plans!plan_id (
            name,
            price
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .gt('subscription_plans.price', '0')
        .order('ends_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error || !data) return;

      const sub: Subscription = {
        id: data.id,
        ends_at: data.ends_at,
        plan_id: data.plan_id,
        plan_name: (data.subscription_plans as any)?.name || '',
        plan_price: (data.subscription_plans as any)?.price || '0',
        reminder_48h_sent: data.reminder_48h_sent,
        reminder_24h_sent: data.reminder_24h_sent,
      };

      const hours = calculateHoursRemaining(sub.ends_at);
      setHoursRemaining(hours);

      if (hours <= 48 && hours > 24 && !sub.reminder_48h_sent) {
        setSubscription(sub);
        setAlertType('48h');
        setShowAlert(true);
        await markReminderSent(sub.id, '48h');

        setTimeout(() => {
          setShowAIMessage(true);
        }, 2000);
      } else if (hours <= 24 && hours > 0 && !sub.reminder_24h_sent) {
        setSubscription(sub);
        setAlertType('24h');
        setShowAlert(true);
        await markReminderSent(sub.id, '24h');

        setTimeout(() => {
          setShowAIMessage(true);
        }, 2000);
      } else if (hours <= 48) {
        setSubscription(sub);
        setShowAlert(true);

        if (hours <= 24) {
          setAlertType('24h');
        } else {
          setAlertType('48h');
        }
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const calculateHoursRemaining = (endsAt: string): number => {
    const end = new Date(endsAt);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60));
  };

  const markReminderSent = async (subscriptionId: string, reminderType: '48h' | '24h') => {
    const field = reminderType === '48h' ? 'reminder_48h_sent' : 'reminder_24h_sent';
    await supabase
      .from('user_subscriptions')
      .update({
        [field]: true,
        last_reminder_sent: new Date().toISOString(),
      })
      .eq('id', subscriptionId);
  };

  if (!showAlert || !subscription) return null;

  return (
    <>
      {/* Alert Banner */}
      <div
        className={`fixed top-20 left-0 right-0 z-40 ${
          alertType === '24h'
            ? 'bg-gradient-to-r from-red-500 to-red-600'
            : 'bg-gradient-to-r from-yellow-500 to-yellow-600'
        } text-white shadow-2xl`}
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${
                alertType === '24h' ? 'bg-red-700 animate-pulse' : 'bg-yellow-700'
              }`}>
                {alertType === '24h' ? (
                  <AlertTriangle className="w-6 h-6 animate-bounce" />
                ) : (
                  <Bell className="w-6 h-6 animate-pulse" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-lg">
                  {alertType === '24h'
                    ? '⚠️ تحذير: اشتراكك ينتهي قريباً جداً!'
                    : '🔔 تنبيه: اشتراكك يقترب من الانتهاء'}
                </h3>
                <p className="text-sm text-white/90">
                  <Clock className="w-4 h-4 inline ml-1" />
                  باقة {subscription.plan_name} ستنتهي خلال {hoursRemaining} ساعة
                  {alertType === '24h' && ' - جدد الآن قبل التحويل للباقة المجانية!'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAlert(false)}
              className="p-2 hover:bg-white/20 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* AI Assistant Message */}
      {showAIMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-200 overflow-hidden animate-slideInRight">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 animate-pulse" />
                <span className="font-bold">المساعد الذكي</span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-gray-800 leading-relaxed">
                {alertType === '24h' ? (
                  <>
                    <span className="font-bold text-red-600">تنبيه هام!</span> باقتك ستنتهي خلال 24 ساعة فقط.
                    <br />
                    اشترك الآن قبل أن تتحول إلى <span className="font-bold">الباقة المجانية المحدودة</span>.
                  </>
                ) : (
                  <>
                    مرحباً! لاحظت أن باقتك <span className="font-bold">{subscription.plan_name}</span> ستنتهي قريباً.
                    <br />
                    أقترح عليك التجديد الآن للاستمرار بالاستفادة من جميع المميزات.
                  </>
                )}
              </p>
              <div className="flex gap-2">
                <button className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg font-bold">
                  تجديد الآن
                </button>
                <button
                  onClick={() => setShowAIMessage(false)}
                  className="px-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all"
                >
                  لاحقاً
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pulsing Icon Indicator */}
      <div className="fixed top-24 left-6 z-50">
        <div className="relative">
          <div
            className={`absolute inset-0 rounded-full ${
              alertType === '24h' ? 'bg-red-500' : 'bg-yellow-500'
            } animate-ping`}
          />
          <div
            className={`relative ${
              alertType === '24h' ? 'bg-red-500' : 'bg-yellow-500'
            } text-white p-3 rounded-full shadow-lg`}
          >
            <Bell className="w-6 h-6 animate-bounce" />
          </div>
        </div>
      </div>

      {/* Add animations */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slideInRight {
          animation: slideInRight 0.5s ease-out;
        }
      `}</style>
    </>
  );
}
