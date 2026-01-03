import { useState, useEffect } from 'react';
import { ArrowRight, Bell, CheckCircle, Clock, Calendar, TreePine } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface InvestmentNotification {
  id: string;
  title: string;
  message: string;
  type: 'booking_confirmed' | 'booking_pending' | 'payment_reminder' | 'harvest_update' | 'general';
  created_at: string;
  is_read: boolean;
}

interface InvestmentNotificationsProps {
  onBack: () => void;
}

export function InvestmentNotifications({ onBack }: InvestmentNotificationsProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<InvestmentNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .in('type', ['booking_confirmed', 'booking_pending', 'booking_cancelled', 'booking_completed'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        const formatted = data.map((item: any) => ({
          id: item.id,
          title: item.title || 'إشعار استثمار',
          message: item.message || '',
          type: item.type || 'general',
          created_at: item.created_at,
          is_read: item.is_read || false
        }));
        setNotifications(formatted);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking_confirmed':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'booking_pending':
        return <Clock className="w-6 h-6 text-yellow-600" />;
      case 'harvest_update':
        return <TreePine className="w-6 h-6 text-emerald-600" />;
      default:
        return <Bell className="w-6 h-6 text-blue-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'booking_confirmed':
        return 'border-green-200 bg-green-50';
      case 'booking_pending':
        return 'border-yellow-200 bg-yellow-50';
      case 'harvest_update':
        return 'border-emerald-200 bg-emerald-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium mb-6 transition-all group"
        >
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          رجوع
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-emerald-200 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-2xl shadow-lg">
              <Bell className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                إشعارات الاستثمار
              </h1>
              <p className="text-gray-600 mt-1">جميع الإشعارات المتعلقة بحجوزات استئجار الأشجار</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">جاري تحميل الإشعارات...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">لا توجد إشعارات استثمار حتى الآن</p>
            <p className="text-gray-400 text-sm mt-2">ستظهر هنا جميع الإشعارات المتعلقة بحجوزاتك</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-xl shadow-lg p-6 border-2 ${getNotificationColor(notification.type)} transition-all hover:shadow-xl`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 bg-white p-3 rounded-xl shadow-sm">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{notification.title}</h3>
                    <p className="text-gray-600 mb-3">{notification.message}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(notification.created_at).toLocaleDateString('ar-SA', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </div>
                  </div>
                  {!notification.is_read && (
                    <div className="flex-shrink-0">
                      <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        جديد
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
