import { useState, useEffect } from 'react';
import {
  Zap, Power, AlertTriangle, CheckCircle, TrendingUp,
  Settings, Activity, Brain, Shield, Clock, Database,
  FileText, Bell, Gift, Sparkles, BarChart3
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AISettings {
  id: string;
  is_enabled: boolean;
  auto_receipt_reading: boolean;
  auto_activation: boolean;
  auto_expiry_notifications: boolean;
  auto_promotional_offers: boolean;
  auto_trial_monitoring: boolean;
  auto_plan_suggestions: boolean;
  auto_upgrade_suggestions: boolean;
  error_tolerance: number;
  autonomy_level: number;
}

interface AIStats {
  total_actions: number;
  success_count: number;
  error_count: number;
  warning_count: number;
  success_rate: number;
  avg_confidence: number;
  actions_by_type: Record<string, number>;
}

interface AILog {
  id: string;
  action_type: string;
  action_data: any;
  status: string;
  result: any;
  error_message: string | null;
  confidence_score: number | null;
  created_at: string;
}

export function AIControlPanel() {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [stats, setStats] = useState<AIStats | null>(null);
  const [logs, setLogs] = useState<AILog[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadAIData();
    const interval = setInterval(loadAIData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadAIData = async () => {
    try {
      const [settingsData, statsData, logsData] = await Promise.all([
        supabase
          .from('ai_control_settings')
          .select('*')
          .eq('id', '00000000-0000-0000-0000-000000000001')
          .single(),
        supabase.rpc('get_ai_statistics', { p_days: 7 }),
        supabase
          .from('ai_action_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (settingsData.data) setSettings(settingsData.data);
      if (statsData.data) setStats(statsData.data);
      if (logsData.data) setLogs(logsData.data);
    } catch (error) {
      console.error('Error loading AI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAI = async () => {
    if (!settings) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('ai_control_settings')
        .update({ is_enabled: !settings.is_enabled, updated_at: new Date().toISOString() })
        .eq('id', settings.id);

      if (error) throw error;

      await supabase.rpc('log_ai_action', {
        p_action_type: settings.is_enabled ? 'ai_disabled' : 'ai_enabled',
        p_action_data: { previous_state: settings.is_enabled },
        p_status: 'success',
        p_result: { new_state: !settings.is_enabled },
      });

      await loadAIData();
    } catch (error) {
      console.error('Error toggling AI:', error);
    } finally {
      setUpdating(false);
    }
  };

  const updateSetting = async (key: keyof AISettings, value: boolean | number) => {
    if (!settings) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('ai_control_settings')
        .update({ [key]: value, updated_at: new Date().toISOString() })
        .eq('id', settings.id);

      if (error) throw error;

      await supabase.rpc('log_ai_action', {
        p_action_type: 'settings_updated',
        p_action_data: { setting: key, old_value: settings[key], new_value: value },
        p_status: 'success',
      });

      await loadAIData();
    } catch (error) {
      console.error('Error updating setting:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'warning':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'receipt_read':
        return <FileText className="w-4 h-4" />;
      case 'activation':
        return <CheckCircle className="w-4 h-4" />;
      case 'notification_sent':
        return <Bell className="w-4 h-4" />;
      case 'promotional_offer':
        return <Gift className="w-4 h-4" />;
      case 'plan_suggestion':
        return <Sparkles className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const formatActionName = (type: string) => {
    const names: Record<string, string> = {
      receipt_read: 'قراءة إيصال',
      activation: 'تفعيل باقة',
      notification_sent: 'إرسال تنبيه',
      promotional_offer: 'عرض ترويجي',
      plan_suggestion: 'اقتراح باقة',
      upgrade_suggestion: 'اقتراح ترقية',
      trial_monitoring: 'مراقبة تجربة',
      ai_enabled: 'تشغيل AI',
      ai_disabled: 'تعطيل AI',
      settings_updated: 'تحديث إعدادات',
    };
    return names[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center p-12">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">فشل تحميل إعدادات الذكاء الصناعي</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Brain className="w-8 h-8 text-purple-600" />
          لوحة التحكم في الذكاء الصناعي
        </h2>
      </div>

      <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-8 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold mb-2">حالة الذكاء الصناعي</h3>
            <p className="text-purple-100 text-sm">
              مستوى الاستقلالية: {Math.round(settings.autonomy_level * 100)}%
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`w-4 h-4 rounded-full animate-pulse ${settings.is_enabled ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-lg font-bold">
              {settings.is_enabled ? 'نشط' : 'متوقف'}
            </span>
          </div>
        </div>

        <button
          onClick={toggleAI}
          disabled={updating}
          className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${
            settings.is_enabled
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
          } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {settings.is_enabled ? (
            <>
              <Power className="w-6 h-6" />
              تعطيل الذكاء الصناعي (طوارئ)
            </>
          ) : (
            <>
              <Zap className="w-6 h-6" />
              تشغيل الذكاء الصناعي
            </>
          )}
        </button>

        {settings.is_enabled && (
          <div className="mt-4 text-sm text-purple-100 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            نسبة التسامح مع الأخطاء: {Math.round(settings.error_tolerance * 100)}%
          </div>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-10 h-10 text-blue-600" />
              <div className="text-right">
                <p className="text-sm text-gray-600">إجمالي العمليات</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_actions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border-2 border-green-200 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
              <div className="text-right">
                <p className="text-sm text-gray-600">نجحت</p>
                <p className="text-3xl font-bold text-green-600">{stats.success_count}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border-2 border-red-200 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <AlertTriangle className="w-10 h-10 text-red-600" />
              <div className="text-right">
                <p className="text-sm text-gray-600">فشلت</p>
                <p className="text-3xl font-bold text-red-600">{stats.error_count}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border-2 border-purple-200 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-10 h-10 text-purple-600" />
              <div className="text-right">
                <p className="text-sm text-gray-600">معدل النجاح</p>
                <p className="text-3xl font-bold text-purple-600">{stats.success_rate}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          إعدادات الذكاء الصناعي
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-bold text-gray-900">قراءة الإيصالات تلقائياً</p>
                <p className="text-sm text-gray-600">تحليل وقراءة الإيصالات فور رفعها</p>
              </div>
            </div>
            <button
              onClick={() => updateSetting('auto_receipt_reading', !settings.auto_receipt_reading)}
              disabled={updating || !settings.is_enabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.auto_receipt_reading ? 'bg-green-500' : 'bg-gray-300'
              } ${!settings.is_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.auto_receipt_reading ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-bold text-gray-900">تفعيل الباقات تلقائياً</p>
                <p className="text-sm text-gray-600">تفعيل الاشتراكات بعد التحقق من الدفع</p>
              </div>
            </div>
            <button
              onClick={() => updateSetting('auto_activation', !settings.auto_activation)}
              disabled={updating || !settings.is_enabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.auto_activation ? 'bg-green-500' : 'bg-gray-300'
              } ${!settings.is_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.auto_activation ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-bold text-gray-900">إرسال التنبيهات تلقائياً</p>
                <p className="text-sm text-gray-600">تنبيه المشتركين قبل انتهاء الاشتراك</p>
              </div>
            </div>
            <button
              onClick={() => updateSetting('auto_expiry_notifications', !settings.auto_expiry_notifications)}
              disabled={updating || !settings.is_enabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.auto_expiry_notifications ? 'bg-green-500' : 'bg-gray-300'
              } ${!settings.is_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.auto_expiry_notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Gift className="w-5 h-5 text-purple-600" />
              <div>
                <p className="font-bold text-gray-900">تشغيل العروض الترويجية</p>
                <p className="text-sm text-gray-600">تفعيل عرض "شهر عليك وشهر علينا"</p>
              </div>
            </div>
            <button
              onClick={() => updateSetting('auto_promotional_offers', !settings.auto_promotional_offers)}
              disabled={updating || !settings.is_enabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.auto_promotional_offers ? 'bg-green-500' : 'bg-gray-300'
              } ${!settings.is_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.auto_promotional_offers ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-teal-600" />
              <div>
                <p className="font-bold text-gray-900">مراقبة التجربة المجانية</p>
                <p className="text-sm text-gray-600">متابعة المستخدمين في فترة التجربة</p>
              </div>
            </div>
            <button
              onClick={() => updateSetting('auto_trial_monitoring', !settings.auto_trial_monitoring)}
              disabled={updating || !settings.is_enabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.auto_trial_monitoring ? 'bg-green-500' : 'bg-gray-300'
              } ${!settings.is_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.auto_trial_monitoring ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-bold text-gray-900">اقتراح أفضل باقة</p>
                <p className="text-sm text-gray-600">تحليل سلوك المستخدم واقتراح الباقة المناسبة</p>
              </div>
            </div>
            <button
              onClick={() => updateSetting('auto_plan_suggestions', !settings.auto_plan_suggestions)}
              disabled={updating || !settings.is_enabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.auto_plan_suggestions ? 'bg-green-500' : 'bg-gray-300'
              } ${!settings.is_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.auto_plan_suggestions ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-bold text-gray-900">اقتراح الترقية</p>
                <p className="text-sm text-gray-600">تقديم عروض ترقية للمشتركين المناسبين</p>
              </div>
            </div>
            <button
              onClick={() => updateSetting('auto_upgrade_suggestions', !settings.auto_upgrade_suggestions)}
              disabled={updating || !settings.is_enabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.auto_upgrade_suggestions ? 'bg-green-500' : 'bg-gray-300'
              } ${!settings.is_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.auto_upgrade_suggestions ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Database className="w-6 h-6 text-green-600" />
          سجل العمليات الأخير
        </h3>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              لا توجد عمليات مسجلة
            </div>
          ) : (
            logs.map(log => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className={`p-2 rounded-lg ${getStatusColor(log.status)}`}>
                  {getActionIcon(log.action_type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-gray-900">{formatActionName(log.action_type)}</p>
                    <span className="text-xs text-gray-500">
                      {new Date(log.created_at).toLocaleString('ar-SA')}
                    </span>
                  </div>
                  {log.confidence_score && (
                    <div className="text-xs text-gray-600 mb-1">
                      درجة الثقة: {Math.round(log.confidence_score * 100)}%
                    </div>
                  )}
                  {log.error_message && (
                    <p className="text-sm text-red-600">{log.error_message}</p>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(log.status)}`}>
                    {log.status === 'success' ? 'نجح' : log.status === 'error' ? 'فشل' : 'تحذير'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {stats && stats.actions_by_type && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            توزيع العمليات (آخر 7 أيام)
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(stats.actions_by_type).map(([type, count]) => (
              <div key={type} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  {getActionIcon(type)}
                  <p className="text-sm font-bold text-gray-900">{formatActionName(type)}</p>
                </div>
                <p className="text-2xl font-bold text-blue-600">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
