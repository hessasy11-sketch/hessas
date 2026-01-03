import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, Clock, Sparkles, AlertCircle, ArrowUp, ArrowDown, Plus, Pause, Play, Ban } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserSubscription {
  user_id: string;
  plan_id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  auto_renew: boolean;
  is_trial: boolean;
  profiles: {
    display_name: string;
    phone_number: string;
  };
  subscription_plans: {
    name: string;
    price: number;
    duration_days: number;
  };
}

type PlanType = 'free' | 'silver' | 'gold';

interface ActionModalProps {
  user: UserSubscription;
  onClose: () => void;
  onAction: (action: string, data?: any) => Promise<void>;
  planType: PlanType;
}

function ActionModal({ user, onClose, onAction, planType }: ActionModalProps) {
  const [selectedAction, setSelectedAction] = useState('');
  const [targetPlan, setTargetPlan] = useState('');
  const [extensionDays, setExtensionDays] = useState(30);
  const [processing, setProcessing] = useState(false);
  const [notes, setNotes] = useState('');
  const [featuresToDisable, setFeaturesToDisable] = useState<string[]>([]);

  const handleSubmit = async () => {
    if (!selectedAction) return;
    setProcessing(true);
    try {
      await onAction(selectedAction, { targetPlan, extensionDays, notes, featuresToDisable });
      onClose();
    } catch (error) {
      console.error('Action error:', error);
      alert('حدث خطأ أثناء تنفيذ العملية');
    } finally {
      setProcessing(false);
    }
  };

  const getAvailableActions = () => {
    switch (planType) {
      case 'free':
        return [
          { id: 'upgrade_silver', label: 'ترقية إلى الفضية', icon: ArrowUp, color: 'blue' },
          { id: 'upgrade_gold', label: 'ترقية إلى الذهبية', icon: ArrowUp, color: 'yellow' },
          { id: 'extend', label: 'تمديد المجانية', icon: Plus, color: 'green' },
          { id: 'suspend', label: 'تعليق الحساب', icon: Ban, color: 'red' },
        ];
      case 'silver':
        return [
          { id: 'upgrade_gold', label: 'ترقية إلى الذهبية', icon: ArrowUp, color: 'yellow' },
          { id: 'downgrade_free', label: 'تنزيل إلى المجانية', icon: ArrowDown, color: 'gray' },
          { id: 'extend', label: 'تمديد الاشتراك', icon: Plus, color: 'green' },
          { id: 'disable_features', label: 'إيقاف مميزات يدوياً', icon: Pause, color: 'orange' },
          { id: 'suspend', label: 'تعليق الحساب', icon: Ban, color: 'red' },
        ];
      case 'gold':
        return [
          { id: 'downgrade_silver', label: 'تنزيل إلى الفضية', icon: ArrowDown, color: 'blue' },
          { id: 'downgrade_free', label: 'تنزيل إلى المجانية', icon: ArrowDown, color: 'gray' },
          { id: 'extend', label: 'تمديد الاشتراك', icon: Plus, color: 'green' },
          { id: 'disable_features', label: 'إيقاف مميزات يدوياً', icon: Pause, color: 'orange' },
          { id: 'suspend', label: 'تعليق الحساب', icon: Ban, color: 'red' },
        ];
      default:
        return [];
    }
  };

  const availableFeatures = planType === 'silver' || planType === 'gold' ? [
    { id: 'create_auction', label: 'إنشاء مزادات' },
    { id: 'create_request', label: 'إنشاء طلبات' },
    { id: 'make_offers', label: 'تقديم عروض' },
    { id: 'chat', label: 'المحادثات' },
    { id: 'view_phone', label: 'عرض أرقام الهاتف' },
  ] : [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">إجراءات المشترك</h2>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700"><strong>الاسم:</strong> {user.profiles.display_name}</p>
          <p className="text-sm text-gray-700"><strong>الهاتف:</strong> {user.profiles.phone_number}</p>
          <p className="text-sm text-gray-700"><strong>الباقة الحالية:</strong> {user.subscription_plans.name}</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-3">اختر الإجراء:</label>
          <div className="grid grid-cols-2 gap-3">
            {getAvailableActions().map((action) => {
              const Icon = action.icon;
              const isSelected = selectedAction === action.id;
              return (
                <button
                  key={action.id}
                  onClick={() => setSelectedAction(action.id)}
                  className={`flex items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 text-${action.color}-600`} />
                  <span className="font-bold text-sm">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {selectedAction && (selectedAction.includes('upgrade') || selectedAction.includes('downgrade')) && (
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">الباقة المستهدفة:</label>
            <select
              value={targetPlan}
              onChange={(e) => setTargetPlan(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none"
            >
              <option value="">اختر الباقة</option>
              {selectedAction.includes('silver') && <option value="silver">الفضية</option>}
              {selectedAction.includes('gold') && <option value="gold">الذهبية</option>}
              {selectedAction.includes('free') && <option value="free">المجانية</option>}
            </select>
          </div>
        )}

        {selectedAction === 'extend' && (
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">مدة التمديد (بالأيام):</label>
            <input
              type="number"
              value={extensionDays}
              onChange={(e) => setExtensionDays(Number(e.target.value))}
              min="1"
              max="365"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none"
            />
          </div>
        )}

        {selectedAction === 'disable_features' && (
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">اختر المميزات المراد إيقافها:</label>
            <div className="space-y-2 bg-gray-50 rounded-lg p-4">
              {availableFeatures.map((feature) => (
                <label key={feature.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featuresToDisable.includes(feature.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFeaturesToDisable([...featuresToDisable, feature.id]);
                      } else {
                        setFeaturesToDisable(featuresToDisable.filter(f => f !== feature.id));
                      }
                    }}
                    className="w-5 h-5 text-emerald-600 border-2 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-gray-700">{feature.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">ملاحظات (اختياري):</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none"
            rows={3}
            placeholder="أضف ملاحظاتك هنا..."
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={processing}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-all"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={processing || !selectedAction}
            className="flex-1 px-6 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-all"
          >
            {processing ? 'جاري التنفيذ...' : 'حفظ وتنفيذ'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminSubscriptionReview() {
  const [freeUsers, setFreeUsers] = useState<UserSubscription[]>([]);
  const [silverUsers, setSilverUsers] = useState<UserSubscription[]>([]);
  const [goldUsers, setGoldUsers] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<{ user: UserSubscription; planType: PlanType } | null>(null);
  const [aiEnabled, setAiEnabled] = useState(true);

  useEffect(() => {
    loadAllSubscriptions();
    loadAISettings();
  }, []);

  const loadAISettings = async () => {
    try {
      const { data } = await supabase
        .from('ai_settings')
        .select('ai_enabled')
        .single();

      if (data) {
        setAiEnabled(data.ai_enabled);
      }
    } catch (error) {
      console.error('Error loading AI settings:', error);
    }
  };

  const toggleAI = async () => {
    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (!adminUser) throw new Error('Unauthorized');

      const newStatus = !aiEnabled;

      await supabase
        .from('ai_settings')
        .update({
          ai_enabled: newStatus,
          updated_at: new Date().toISOString(),
          updated_by: adminUser.id
        })
        .eq('id', (await supabase.from('ai_settings').select('id').single()).data?.id);

      setAiEnabled(newStatus);
      alert(newStatus ? '✅ تم تفعيل الذكاء الصناعي' : '⚠️ تم تعطيل الذكاء الصناعي - الإجراءات ستكون يدوية فقط');
    } catch (error) {
      console.error('Error toggling AI:', error);
      alert('حدث خطأ أثناء تغيير إعدادات الذكاء الصناعي');
    }
  };

  const loadAllSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          profiles (display_name, phone_number),
          subscription_plans (name, price, duration_days)
        `)
        .order('starts_at', { ascending: false });

      if (error) throw error;

      const free: UserSubscription[] = [];
      const silver: UserSubscription[] = [];
      const gold: UserSubscription[] = [];

      data?.forEach((sub: any) => {
        const planName = sub.subscription_plans.name.toLowerCase();
        if (planName.includes('free')) {
          free.push(sub);
        } else if (planName.includes('agricultural')) {
          silver.push(sub);
        } else if (planName.includes('golden')) {
          gold.push(sub);
        }
      });

      setFreeUsers(free);
      setSilverUsers(silver);
      setGoldUsers(gold);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (userId: string, action: string, data?: any) => {
    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (!adminUser) throw new Error('Unauthorized');

      const { targetPlan, extensionDays, notes, featuresToDisable } = data || {};

      if (action === 'suspend') {
        await supabase
          .from('user_subscriptions')
          .update({ status: 'cancelled' })
          .eq('user_id', userId);

        alert('✅ تم تعليق الحساب');
      }
      else if (action === 'disable_features') {
        if (!featuresToDisable || featuresToDisable.length === 0) {
          alert('⚠️ يجب اختيار مميزة واحدة على الأقل');
          return;
        }

        await supabase.from('subscription_action_logs').insert({
          user_id: userId,
          admin_id: adminUser.id,
          action_type: 'disable_features',
          action_data: { disabled_features: featuresToDisable },
          notes: notes || 'تم إيقاف مميزات يدوياً'
        });

        alert(`✅ تم إيقاف ${featuresToDisable.length} مميزة يدوياً`);
      }
      else if (action === 'extend') {
        const { data: currentSub } = await supabase
          .from('user_subscriptions')
          .select('ends_at')
          .eq('user_id', userId)
          .single();

        if (currentSub) {
          const currentEndDate = new Date(currentSub.ends_at);
          const newEndDate = new Date(currentEndDate.getTime() + extensionDays * 24 * 60 * 60 * 1000);

          await supabase
            .from('user_subscriptions')
            .update({ ends_at: newEndDate.toISOString() })
            .eq('user_id', userId);

          alert(`✅ تم تمديد الاشتراك ${extensionDays} يوم`);
        }
      }
      else if (action.includes('upgrade') || action.includes('downgrade')) {
        const planMap: Record<string, string> = {
          'free': 'a581fe3b-738b-483f-ae01-98fc9e58dd35',
          'silver': '5750a6b1-ce02-42ce-9809-e71700ab9133',
          'gold': 'a5525e04-444b-480d-a0c6-506b02f5bfcc'
        };

        const newPlanId = planMap[targetPlan];
        if (!newPlanId) {
          alert('⚠️ يجب اختيار الباقة المستهدفة');
          return;
        }

        const { data: planInfo } = await supabase
          .from('subscription_plans')
          .select('duration_days, name')
          .eq('id', newPlanId)
          .single();

        if (planInfo) {
          const startDate = new Date();
          const endDate = new Date(startDate.getTime() + planInfo.duration_days * 24 * 60 * 60 * 1000);

          await supabase
            .from('user_subscriptions')
            .update({
              plan_id: newPlanId,
              status: 'active',
              starts_at: startDate.toISOString(),
              ends_at: endDate.toISOString()
            })
            .eq('user_id', userId);

          const actionType = action.includes('upgrade') ? 'ترقية' : 'تنزيل';
          alert(`✅ تم ${actionType} المشترك إلى باقة ${planInfo.name}`);
        }
      }

      await supabase.from('subscription_action_logs').insert({
        user_id: userId,
        admin_id: adminUser.id,
        action_type: action,
        action_data: data,
        notes: notes
      });

      await loadAllSubscriptions();
    } catch (error: any) {
      console.error('Action error:', error);
      alert('❌ حدث خطأ: ' + error.message);
    }
  };

  const getStatusBadge = (user: UserSubscription) => {
    const endDate = new Date(user.ends_at);
    const now = new Date();
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (user.status === 'cancelled') {
      return <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">معلق</span>;
    }

    if (daysLeft < 0) {
      return <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">منتهي</span>;
    }

    if (daysLeft <= 7) {
      return <span className="px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full animate-pulse">على وشك الانتهاء ({daysLeft} أيام)</span>;
    }

    return <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">نشط ({daysLeft} يوم)</span>;
  };

  const getFreeTrialTypeBadge = (user: UserSubscription) => {
    const isTrial = user.is_trial;
    if (isTrial) {
      return <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800">مجاني تجريبي</span>;
    }
    return <span className="px-3 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-800">مجاني أساسي</span>;
  };

  const renderUserTable = (users: UserSubscription[], planType: PlanType, title: string, bgColor: string) => (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className={`text-xl font-bold mb-4 ${bgColor}`}>{title} ({users.length})</h2>

      {users.length === 0 ? (
        <div className="text-center py-8 text-gray-500">لا يوجد مشتركين في هذه الباقة</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right font-bold text-gray-700">اسم المشترك</th>
                <th className="px-4 py-3 text-right font-bold text-gray-700">رقم الجوال</th>
                {planType === 'free' && <th className="px-4 py-3 text-right font-bold text-gray-700">نوع المجانية</th>}
                <th className="px-4 py-3 text-right font-bold text-gray-700">تاريخ البداية</th>
                <th className="px-4 py-3 text-right font-bold text-gray-700">تاريخ الانتهاء</th>
                <th className="px-4 py-3 text-right font-bold text-gray-700">الحالة</th>
                <th className="px-4 py-3 text-right font-bold text-gray-700">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.user_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{user.profiles.display_name}</td>
                  <td className="px-4 py-3">{user.profiles.phone_number}</td>
                  {planType === 'free' && <td className="px-4 py-3">{getFreeTrialTypeBadge(user)}</td>}
                  <td className="px-4 py-3">{new Date(user.starts_at).toLocaleDateString('ar-SA')}</td>
                  <td className="px-4 py-3">{new Date(user.ends_at).toLocaleDateString('ar-SA')}</td>
                  <td className="px-4 py-3">{getStatusBadge(user)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedUser({ user, planType })}
                      className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all"
                    >
                      إجراءات
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-8 h-8 text-emerald-600" />
                <h1 className="text-2xl font-bold text-gray-900">مراجعة المشتركين</h1>
              </div>
              <p className="text-gray-600">إدارة جميع المشتركين حسب الباقات</p>
            </div>

            <button
              onClick={toggleAI}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all shadow-lg ${
                aiEnabled
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              {aiEnabled ? (
                <>
                  <Play className="w-5 h-5" />
                  الذكاء الصناعي مفعّل
                </>
              ) : (
                <>
                  <Pause className="w-5 h-5" />
                  الذكاء الصناعي معطّل
                </>
              )}
            </button>
          </div>
        </div>

        {aiEnabled && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Sparkles className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-blue-900 mb-1">الذكاء الصناعي نشط</p>
                <p className="text-sm text-blue-800">
                  سيقوم النظام تلقائياً بترقية المشتركين عند تأكيد الإيصالات، وإرسال التنبيهات قبل انتهاء الباقات، وإعادة المستخدمين للباقة المجانية عند انتهاء اشتراكهم.
                </p>
              </div>
            </div>
          </div>
        )}

        {!aiEnabled && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-900 mb-1">الذكاء الصناعي معطّل</p>
                <p className="text-sm text-red-800">
                  جميع الإجراءات ستكون يدوية. لن يتم إجراء أي تحديثات تلقائية على الاشتراكات.
                </p>
              </div>
            </div>
          </div>
        )}

        {renderUserTable(freeUsers, 'free', '📦 مشتركو الباقة المجانية', 'text-gray-700')}
        {renderUserTable(silverUsers, 'silver', '⚡ مشتركو الباقة الفضية', 'text-blue-600')}
        {renderUserTable(goldUsers, 'gold', '👑 مشتركو الباقة الذهبية', 'text-yellow-600')}

        {selectedUser && (
          <ActionModal
            user={selectedUser.user}
            planType={selectedUser.planType}
            onClose={() => setSelectedUser(null)}
            onAction={(action, data) => handleAction(selectedUser.user.user_id, action, data)}
          />
        )}
      </div>
    </div>
  );
}
