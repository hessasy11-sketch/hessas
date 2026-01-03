import { useState } from 'react';
import { ArrowRight, Bell, CheckCheck, Settings, BellOff, Clock, ExternalLink } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { formatDistanceToNow } from '../utils/dateUtils';

interface NotificationsViewProps {
  onBack: () => void;
  onNavigate: (page: string) => void;
}

export function NotificationsView({ onBack, onNavigate }: NotificationsViewProps) {
  const { notifications, preferences, markAsRead, markAllAsRead, updatePreferences } = useNotifications();
  const [selectedType, setSelectedType] = useState<'all' | 'financial' | 'auction' | 'interaction' | 'ai_assistant' | 'system'>('all');
  const [showSettings, setShowSettings] = useState(false);

  const filteredNotifications = selectedType === 'all'
    ? notifications
    : notifications.filter(n => n.type === selectedType);

  const groupedNotifications = {
    financial: filteredNotifications.filter(n => n.type === 'financial'),
    auction: filteredNotifications.filter(n => n.type === 'auction'),
    interaction: filteredNotifications.filter(n => n.type === 'interaction'),
    ai_assistant: filteredNotifications.filter(n => n.type === 'ai_assistant'),
    system: filteredNotifications.filter(n => n.type === 'system')
  };

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    markAsRead(notification.id);
    if (notification.link) {
      const page = notification.link.split('/')[1];
      if (page) {
        onNavigate(page);
      }
    }
  };

  const toggleNotificationType = (type: keyof typeof preferences.enabled_types) => {
    if (!preferences) return;
    updatePreferences({
      enabled_types: {
        ...preferences.enabled_types,
        [type]: !preferences.enabled_types[type]
      }
    });
  };

  if (showSettings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50" dir="rtl">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4 flex items-center gap-3 shadow-lg sticky top-0 z-10">
          <button
            onClick={() => setShowSettings(false)}
            className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings className="w-6 h-6" />
              إعدادات الإشعارات
            </h2>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6 pb-20">
          <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-gray-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4">أنواع الإشعارات</h3>

            {preferences && (
              <div className="space-y-3">
                {Object.entries(preferences.enabled_types).map(([type, enabled]) => (
                  <label
                    key={type}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {type === 'financial' && '💰'}
                        {type === 'auction' && '🌾'}
                        {type === 'interaction' && '💬'}
                        {type === 'ai_assistant' && '🤖'}
                        {type === 'system' && '🔔'}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800">
                          {type === 'financial' && 'إشعارات مالية'}
                          {type === 'auction' && 'إشعارات المزادات'}
                          {type === 'interaction' && 'التفاعل الاجتماعي'}
                          {type === 'ai_assistant' && 'المساعد الذكي'}
                          {type === 'system' && 'إشعارات النظام'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {type === 'financial' && 'الدفعات والتحويلات والأرباح'}
                          {type === 'auction' && 'انتهاء المزادات والفوز والعروض'}
                          {type === 'interaction' && 'التعليقات والرسائل والمتابعات'}
                          {type === 'ai_assistant' && 'ردود المساعد الزراعي الذكي'}
                          {type === 'system' && 'التحديثات والأخبار العامة'}
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => toggleNotificationType(type as keyof typeof preferences.enabled_types)}
                      className="w-6 h-6 text-green-600"
                    />
                  </label>
                ))}
              </div>
            )}

            <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <BellOff className="w-5 h-5 text-yellow-600" />
                <h4 className="font-bold text-yellow-800">الوضع الصامت</h4>
              </div>
              <p className="text-sm text-yellow-700 mb-3">
                تعطيل الإشعارات غير العاجلة مؤقتاً (الإشعارات المهمة ستصل دائماً)
              </p>
              {preferences?.silent_mode ? (
                <button
                  onClick={() => updatePreferences({ silent_mode: false })}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-bold text-sm"
                >
                  إيقاف الوضع الصامت
                </button>
              ) : (
                <button
                  onClick={() => updatePreferences({
                    silent_mode: true,
                    silent_mode_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                  })}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-xl font-bold text-sm"
                >
                  تفعيل لمدة 24 ساعة
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-amber-50" dir="rtl">
      <div className="bg-gradient-to-r from-yellow-500 to-amber-600 p-4 flex items-center gap-3 shadow-lg sticky top-0 z-10">
        <button
          onClick={onBack}
          className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6" />
            مركز الإشعارات
          </h2>
          <p className="text-sm text-white/90">كل إشعاراتك في مكان واحد</p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-6 pb-20">
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
          {[
            { value: 'all', label: 'الكل', icon: '📢' },
            { value: 'financial', label: 'مالية', icon: '💰' },
            { value: 'auction', label: 'مزادات', icon: '🌾' },
            { value: 'interaction', label: 'تفاعل', icon: '💬' },
            { value: 'ai_assistant', label: 'مساعد ذكي', icon: '🤖' },
            { value: 'system', label: 'النظام', icon: '🔔' }
          ].map((type) => (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value as typeof selectedType)}
              className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                selectedType === type.value
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {type.icon} {type.label}
            </button>
          ))}
        </div>

        {notifications.length > 0 && (
          <div className="mb-6">
            <button
              onClick={markAllAsRead}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              <CheckCheck className="w-5 h-5" />
              تمييز الكل كمقروء ({notifications.filter(n => !n.is_read).length} غير مقروء)
            </button>
          </div>
        )}

        {selectedType === 'all' ? (
          <div className="space-y-8">
            {Object.entries(groupedNotifications).map(([type, notifs]) => {
              if (notifs.length === 0) return null;

              const titles: Record<string, { title: string; icon: string }> = {
                financial: { title: 'إشعارات مالية', icon: '💰' },
                auction: { title: 'المزادات', icon: '🌾' },
                interaction: { title: 'التفاعل الاجتماعي', icon: '💬' },
                ai_assistant: { title: 'المساعد الذكي', icon: '🤖' },
                system: { title: 'النظام', icon: '��' }
              };

              return (
                <div key={type} className="bg-white rounded-2xl shadow-xl p-6 border-2 border-gray-200">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="text-2xl">{titles[type].icon}</span>
                    {titles[type].title}
                    <span className="text-sm bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                      {notifs.length}
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {notifs.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-4 rounded-xl cursor-pointer transition-all ${
                          !notification.is_read
                            ? 'bg-blue-50 hover:bg-blue-100 border-2 border-blue-200'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="text-3xl flex-shrink-0">{notification.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className={`font-bold ${
                                !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                              }`}>
                                {notification.title}
                              </h4>
                              {!notification.is_read && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(notification.created_at)}
                              </span>
                              {notification.priority === 'urgent' && (
                                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                                  عاجل
                                </span>
                              )}
                              {notification.priority === 'important' && (
                                <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-full font-bold">
                                  مهم
                                </span>
                              )}
                              {notification.link && (
                                <span className="text-xs text-blue-500 flex items-center gap-1">
                                  <ExternalLink className="w-3 h-3" />
                                  عرض التفاصيل
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-gray-200">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-3">🔔</div>
                <p className="text-gray-500 font-medium">لا توجد إشعارات من هذا النوع</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 rounded-xl cursor-pointer transition-all ${
                      !notification.is_read
                        ? 'bg-blue-50 hover:bg-blue-100 border-2 border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="text-3xl flex-shrink-0">{notification.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`font-bold ${
                            !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(notification.created_at)}
                          </span>
                          {notification.priority === 'urgent' && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                              عاجل
                            </span>
                          )}
                          {notification.priority === 'important' && (
                            <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-full font-bold">
                              مهم
                            </span>
                          )}
                          {notification.link && (
                            <span className="text-xs text-blue-500 flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" />
                              عرض التفاصيل
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
        )}
      </div>
    </div>
  );
}
