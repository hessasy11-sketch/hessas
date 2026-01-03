import { useState, useRef, useEffect } from 'react';
import { Bell, X, CheckCheck, Clock, ExternalLink, Sparkles, TrendingUp } from 'lucide-react';
import { useB2FNotifications } from '../hooks/useB2FNotifications';
import { useGuestNotifications } from '../hooks/useGuestNotifications';
import { useInvestorAuth } from '../contexts/InvestorAuthContext';
import { formatDistanceToNow } from '../utils/dateUtils';

interface B2FNotificationCenterProps {
  onNavigate: (page: string) => void;
}

export function B2FNotificationCenter({ onNavigate }: B2FNotificationCenterProps) {
  const { investorPhone } = useInvestorAuth();
  const { notifications: investorNotifications, unreadCount, markAsRead, markAllAsRead } = useB2FNotifications();
  const { notifications: guestNotifications } = useGuestNotifications();

  const isInvestorLoggedIn = !!investorPhone;
  const notifications = isInvestorLoggedIn ? investorNotifications : guestNotifications;

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'booking' | 'payment' | 'contract' | 'certificate' | 'operation' | 'visit' | 'season' | 'system' | 'announcement' | 'offer' | 'update' | 'event'>('all');
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
    : notifications.filter(n => n.type === filter).slice(0, 10);

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    if (isInvestorLoggedIn && markAsRead) {
      markAsRead(notification.id);
    }

    if (notification.link) {
      const page = notification.link.split('/')[1];
      if (page) {
        onNavigate(page);
        setIsOpen(false);
      }
    }
  };

  const getTypeConfig = (type: string) => {
    const configs: Record<string, { label: string; bgGradient: string; icon: string }> = {
      booking: {
        label: 'حجوزات',
        bgGradient: 'from-green-500/10 to-emerald-500/10 border-green-200',
        icon: '🌳'
      },
      payment: {
        label: 'مدفوعات',
        bgGradient: 'from-blue-500/10 to-cyan-500/10 border-blue-200',
        icon: '💳'
      },
      contract: {
        label: 'عقود',
        bgGradient: 'from-purple-500/10 to-violet-500/10 border-purple-200',
        icon: '📄'
      },
      certificate: {
        label: 'شهادات',
        bgGradient: 'from-yellow-500/10 to-amber-500/10 border-yellow-200',
        icon: '🎖️'
      },
      operation: {
        label: 'تشغيل',
        bgGradient: 'from-orange-500/10 to-red-500/10 border-orange-200',
        icon: '🔧'
      },
      visit: {
        label: 'زيارات',
        bgGradient: 'from-teal-500/10 to-cyan-500/10 border-teal-200',
        icon: '🚗'
      },
      season: {
        label: 'مواسم',
        bgGradient: 'from-lime-500/10 to-green-500/10 border-lime-200',
        icon: '🌾'
      },
      system: {
        label: 'النظام',
        bgGradient: 'from-rose-500/10 to-pink-500/10 border-rose-200',
        icon: '🔔'
      },
      announcement: {
        label: 'إعلان',
        bgGradient: 'from-blue-500/10 to-indigo-500/10 border-blue-200',
        icon: '📢'
      },
      offer: {
        label: 'عرض خاص',
        bgGradient: 'from-pink-500/10 to-rose-500/10 border-pink-200',
        icon: '🎁'
      },
      update: {
        label: 'تحديث',
        bgGradient: 'from-purple-500/10 to-fuchsia-500/10 border-purple-200',
        icon: '✨'
      },
      event: {
        label: 'حدث',
        bgGradient: 'from-amber-500/10 to-orange-500/10 border-amber-200',
        icon: '🎉'
      }
    };
    return configs[type] || { label: type, bgGradient: 'from-gray-500/10 to-gray-500/10 border-gray-200', icon: '📌' };
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 rounded-lg transition-all duration-300 text-gray-500 hover:text-emerald-600 active:text-emerald-700"
        aria-label="الإشعارات"
      >
        <div className="relative">
          <Bell className={`w-5 h-5 ${
            (isInvestorLoggedIn && unreadCount > 0) || (!isInvestorLoggedIn && notifications.length > 0)
              ? 'animate-wiggle'
              : ''
          }`} />

          {/* إشعارات المستثمرين */}
          {isInvestorLoggedIn && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-gradient-to-br from-red-500 to-rose-600 text-white text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center animate-pulse shadow-lg border-2 border-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}

          {/* إشعارات الزوار - علامة بارزة وجذابة */}
          {!isInvestorLoggedIn && notifications.length > 0 && (
            <>
              {/* النبضة الخارجية */}
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-400 rounded-full animate-ping opacity-75"></span>
              {/* العلامة الرئيسية */}
              <span className="absolute -top-1 -right-1 bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 text-white text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow-lg border-2 border-white z-10 animate-bounce">
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            </>
          )}
        </div>
        <span className="text-[10px] font-medium">إشعارات</span>
      </button>

      {isOpen && (
        <div className="fixed left-2 right-2 sm:left-auto sm:right-4 bottom-20 sm:bottom-auto sm:top-auto w-auto sm:w-[420px] bg-gradient-to-b from-white to-gray-50 rounded-3xl shadow-2xl border border-gray-200/50 z-[60] max-h-[calc(100vh-120px)] sm:max-h-[620px] flex flex-col backdrop-blur-xl overflow-hidden" dir="rtl">
          {/* Header مع تأثيرات جميلة */}
          <div className={`relative p-4 sm:p-5 ${
            isInvestorLoggedIn
              ? 'bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600'
              : 'bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600'
          }`}>
            {/* خلفية متحركة */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 animate-shimmer"></div>

            <div className="relative flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                  <Bell className="w-5 h-5 text-white animate-wiggle" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    {isInvestorLoggedIn ? 'إشعاراتي' : 'إعلانات مهمة'}
                    {!isInvestorLoggedIn && notifications.length > 0 && (
                      <span className="text-xs bg-white/30 backdrop-blur-sm px-2 py-1 rounded-full">
                        {notifications.length} جديد
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-white/80 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    <span>{isInvestorLoggedIn ? 'إشعارات خاصة بك' : 'اطلع على آخر العروض'}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 p-2 rounded-xl transition-all duration-300 active:scale-95 backdrop-blur-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* فلاتر محسنة */}
            <div className="relative flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {(isInvestorLoggedIn
                ? ['all', 'booking', 'payment', 'operation', 'certificate', 'season', 'system']
                : ['all', 'announcement', 'offer', 'update', 'event']
              ).map((type) => {
                const config = type === 'all' ? { label: 'الكل', icon: '✨' } : getTypeConfig(type);
                return (
                  <button
                    key={type}
                    onClick={() => setFilter(type as typeof filter)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 flex items-center gap-1.5 flex-shrink-0 ${
                      filter === type
                        ? 'bg-white text-emerald-600 shadow-lg scale-105'
                        : 'bg-white/20 text-white hover:bg-white/30 hover:scale-105'
                    }`}
                  >
                    <span className="text-sm">{config.icon}</span>
                    <span>{type === 'all' ? 'الكل' : config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* قائمة الإشعارات */}
          <div className="flex-1 overflow-y-auto p-3">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-16">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-emerald-200 blur-2xl opacity-50 animate-pulse"></div>
                  <div className="relative text-7xl">🔔</div>
                </div>
                <p className="text-gray-500 font-bold text-lg">لا توجد إشعارات</p>
                <p className="text-gray-400 text-sm mt-1">سنبقيك على اطلاع بكل جديد</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((notification) => {
                  const typeConfig = getTypeConfig(notification.type);
                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`relative group cursor-pointer rounded-2xl border-2 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
                        isInvestorLoggedIn && 'is_read' in notification && !notification.is_read
                          ? `bg-gradient-to-br ${typeConfig.bgGradient} border-2 shadow-md`
                          : !isInvestorLoggedIn
                          ? `bg-gradient-to-br ${typeConfig.bgGradient} border-2 shadow-md`
                          : 'bg-white border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      {/* Badge غير مقروء للمستثمرين فقط */}
                      {isInvestorLoggedIn && 'is_read' in notification && !notification.is_read && (
                        <div className="absolute top-3 left-3 z-10">
                          <div className="relative">
                            <div className="absolute inset-0 bg-emerald-400 blur-md animate-pulse"></div>
                            <div className="relative w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-lg"></div>
                          </div>
                        </div>
                      )}

                      {/* علامة NEW للزوار على الإشعارات */}
                      {!isInvestorLoggedIn && (
                        <div className="absolute top-3 left-3 z-10">
                          <span className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg animate-pulse">
                            جديد
                          </span>
                        </div>
                      )}

                      <div className="p-4">
                        <div className="flex gap-3">
                          {/* أيقونة الإشعار */}
                          <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg ${
                            isInvestorLoggedIn && 'is_read' in notification && !notification.is_read
                              ? 'bg-white'
                              : 'bg-gradient-to-br from-gray-50 to-gray-100'
                          }`}>
                            {notification.icon}
                          </div>

                          {/* محتوى الإشعار */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <h4 className={`font-black text-sm leading-tight ${
                                isInvestorLoggedIn && 'is_read' in notification && !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                              }`}>
                                {notification.title}
                              </h4>
                            </div>

                            <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 mb-2">
                              {notification.message}
                            </p>

                            {/* Footer الإشعار */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400 flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg">
                                  <Clock className="w-3 h-3" />
                                  {formatDistanceToNow(notification.created_at)}
                                </span>

                                {notification.priority === 'urgent' && (
                                  <span className="text-[10px] bg-gradient-to-r from-red-500 to-rose-500 text-white px-2 py-1 rounded-lg font-black flex items-center gap-1">
                                    <span className="animate-pulse">🔥</span>
                                    عاجل
                                  </span>
                                )}

                                {notification.priority === 'important' && (
                                  <span className="text-[10px] bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-2 py-1 rounded-lg font-black flex items-center gap-1">
                                    <span>⚡</span>
                                    مهم
                                  </span>
                                )}
                              </div>

                              {notification.link && (
                                <span className="text-[10px] text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg font-bold group-hover:bg-emerald-100 transition-colors">
                                  <ExternalLink className="w-3 h-3" />
                                  <span>عرض</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* خط سفلي ملون */}
                      {isInvestorLoggedIn && 'is_read' in notification && !notification.is_read && (
                        <div className="h-1 bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500"></div>
                      )}
                      {!isInvestorLoggedIn && (
                        <div className="h-1 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {isInvestorLoggedIn && (
            <div className="border-t border-gray-200/50 p-3 bg-gradient-to-r from-gray-50 to-white backdrop-blur-sm">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    markAllAsRead();
                  }}
                  disabled={unreadCount === 0}
                  className="flex-1 relative overflow-hidden bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white py-3 px-4 rounded-2xl font-black text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95 group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  <CheckCheck className="w-5 h-5 relative z-10" />
                  <span className="relative z-10">تمييز الكل كمقروء ({unreadCount})</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-shimmer {
          animation: shimmer 3s infinite linear;
        }

        @keyframes wiggle {
          0%, 100% {
            transform: rotate(-3deg);
          }
          50% {
            transform: rotate(3deg);
          }
        }

        .animate-wiggle {
          animation: wiggle 1s ease-in-out infinite;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
