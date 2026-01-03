import { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, Clock, ExternalLink } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { formatDistanceToNow } from '../utils/dateUtils';

interface NotificationCenterProps {
  onNavigate: (page: string) => void;
  activeSection?: string;
}

export function NotificationCenter({ onNavigate, activeSection }: NotificationCenterProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'financial' | 'auction' | 'interaction' | 'ai_assistant' | 'system' | 'booking'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredNotifications = filter === 'all'
    ? notifications.slice(0, 10)
    : filter === 'booking'
    ? notifications.filter(n =>
        n.type === 'booking_confirmed' ||
        n.type === 'booking_completed' ||
        n.type === 'booking_cancelled'
      ).slice(0, 10)
    : notifications.filter(n => n.type === filter).slice(0, 10);

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    markAsRead(notification.id);

    // إشعارات الحجوزات توجه إلى قسم استثمار الأشجار
    if (notification.type === 'booking_confirmed' ||
        notification.type === 'booking_completed' ||
        notification.type === 'booking_cancelled') {
      onNavigate('treeRental');
      setIsOpen(false);
      return;
    }

    if (notification.link) {
      const page = notification.link.split('/')[1];
      if (page) {
        onNavigate(page);
        setIsOpen(false);
      }
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      financial: 'مالية 💰',
      auction: 'مزادات 🌾',
      interaction: 'تفاعل 💬',
      ai_assistant: 'مساعد ذكي 🤖',
      system: 'النظام 🔔',
      booking: 'حجوزات 🌲'
    };
    return labels[type] || type;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 rounded-lg transition-all duration-300 ${
          activeSection === 'b2f'
            ? 'text-gray-500 hover:text-emerald-600 active:text-emerald-700'
            : 'text-gray-500 hover:text-amber-600 active:text-amber-700'
        }`}
        aria-label="الإشعارات"
      >
        <div className="relative">
          <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-wiggle' : ''}`} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium">إشعارات</span>
      </button>

      {isOpen && (
        <div className="fixed left-2 right-2 sm:left-auto sm:right-4 bottom-20 sm:bottom-auto sm:top-auto w-auto sm:w-96 bg-white rounded-2xl shadow-2xl border-2 border-gray-200 z-[60] max-h-[calc(100vh-120px)] sm:max-h-[600px] flex flex-col" dir="rtl">
          <div className="bg-gradient-to-r from-yellow-500 to-amber-600 p-3 sm:p-4 rounded-t-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="truncate">مركز الإشعارات الزراعي</span>
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 p-1 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {['all', 'booking', 'financial', 'auction', 'interaction', 'ai_assistant', 'system'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type as typeof filter)}
                  className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                    filter === type
                      ? 'bg-white text-yellow-600'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {type === 'all' ? 'الكل' : getTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-3">🔔</div>
                <p className="text-gray-500 font-medium">لا توجد إشعارات جديدة</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-3 sm:p-4 transition-all cursor-pointer ${
                      !notification.is_read
                        ? 'bg-blue-50 hover:bg-blue-100'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex gap-2 sm:gap-3">
                      <div className="text-2xl sm:text-3xl flex-shrink-0">{notification.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`font-bold text-sm sm:text-base ${
                            !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 sm:gap-3 mt-2 flex-wrap">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(notification.created_at)}
                          </span>
                          {notification.priority === 'urgent' && (
                            <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">
                              عاجل
                            </span>
                          )}
                          {notification.priority === 'important' && (
                            <span className="text-xs bg-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded-full font-bold">
                              مهم
                            </span>
                          )}
                          {notification.link && (
                            <span className="text-xs text-blue-500 flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" />
                              <span className="hidden sm:inline">عرض التفاصيل</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 p-2 sm:p-3 bg-gray-50 rounded-b-2xl flex gap-1.5 sm:gap-2">
            <button
              onClick={() => {
                markAllAsRead();
              }}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-2 sm:px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1 sm:gap-2"
            >
              <CheckCheck className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">تمييز الكل كمقروء</span>
              <span className="sm:hidden">مقروء</span>
            </button>
            <button
              onClick={() => {
                onNavigate('notifications');
                setIsOpen(false);
              }}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-2 sm:px-4 rounded-xl font-bold text-xs sm:text-sm transition-all"
            >
              عرض الكل
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
