import { useState, useEffect } from 'react';
import { Bell, X, Clock, TrendingUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuctionAlertsPanelProps {
  auctionId: string;
  userId: string | undefined;
}

interface Alert {
  id: string;
  alert_type: string;
  title_ar: string;
  message_ar: string;
  severity: string;
  is_read: boolean;
  created_at: string;
}

export function AuctionAlertsPanel({ auctionId, userId }: AuctionAlertsPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (userId) {
      fetchAlerts();
      subscribeToAlerts();
    }
  }, [auctionId, userId]);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('auction_alerts')
        .select('*')
        .eq('auction_id', auctionId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (!data || data.length === 0) {
        generateMockAlerts();
      } else {
        setAlerts(data);
        setUnreadCount(data.filter(a => !a.is_read).length);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
      generateMockAlerts();
    } finally {
      setLoading(false);
    }
  };

  const subscribeToAlerts = () => {
    const channel = supabase
      .channel(`auction-alerts-${auctionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'auction_alerts',
          filter: `auction_id=eq.${auctionId}`
        },
        (payload) => {
          setAlerts(prev => [payload.new as Alert, ...prev].slice(0, 10));
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const generateMockAlerts = () => {
    const mockAlerts: Alert[] = [
      {
        id: '1',
        alert_type: 'ending_soon',
        title_ar: 'ينتهي المزاد قريباً',
        message_ar: 'باقي ساعتان على انتهاء المزاد. تأكد من متابعة المزايدات.',
        severity: 'warning',
        is_read: false,
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        alert_type: 'high_bid',
        title_ar: 'مزايدة كبيرة جديدة',
        message_ar: 'تم إضافة مزايدة جديدة بقيمة 500 ر.س. السعر الحالي: 5,500 ر.س',
        severity: 'success',
        is_read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString()
      },
      {
        id: '3',
        alert_type: 'subscription_expiring',
        title_ar: 'اشتراكك ينتهي قريباً',
        message_ar: 'باقتك تنتهي خلال يومين. قم بالتجديد للحفاظ على جميع المزايا.',
        severity: 'error',
        is_read: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
      }
    ];

    setAlerts(mockAlerts);
    setUnreadCount(mockAlerts.filter(a => !a.is_read).length);
  };

  const markAsRead = async (alertId: string) => {
    try {
      await supabase
        .from('auction_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      setAlerts(prev =>
        prev.map(a => (a.id === alertId ? { ...a, is_read: true } : a))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <Clock className="w-5 h-5 text-orange-600" />;
      case 'success':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-50 border-red-300';
      case 'warning':
        return 'bg-orange-50 border-orange-300';
      case 'success':
        return 'bg-green-50 border-green-300';
      default:
        return 'bg-blue-50 border-blue-300';
    }
  };

  if (!userId) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-center py-4">
          <div className="w-6 h-6 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600" />
          <h3 className="text-base font-bold text-gray-900">التنبيهات</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-3 border rounded-lg ${getSeverityColor(alert.severity)} ${
              !alert.is_read ? 'ring-2 ring-blue-400' : ''
            }`}
          >
            <div className="flex items-start gap-3 text-right">
              <div className="flex-shrink-0 mt-0.5">
                {getSeverityIcon(alert.severity)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-gray-900 mb-1">
                  {alert.title_ar}
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed mb-2">
                  {alert.message_ar}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {new Date(alert.created_at).toLocaleString('ar-EG', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  {!alert.is_read && (
                    <button
                      onClick={() => markAsRead(alert.id)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3" />
                      تم القراءة
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => dismissAlert(alert.id)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
