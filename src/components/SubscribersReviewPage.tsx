import { useState, useEffect } from 'react';
import { ChevronRight, ArrowUp, ArrowDown, Clock, Pause, Calendar, MoreVertical } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Subscriber {
  id: string;
  user_id: string;
  plan_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  display_name: string;
  phone_number: string;
  plan_name: string;
  plan_price: string;
}

interface Plan {
  id: string;
  name: string;
  price: string;
}

interface SubscribersReviewPageProps {
  plans: Plan[];
  onBack: () => void;
}

export function SubscribersReviewPage({ plans, onBack }: SubscribersReviewPageProps) {
  const [activeTab, setActiveTab] = useState<string>(plans[0]?.id || '');
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    loadSubscribers();
  }, [activeTab]);

  const loadSubscribers = async () => {
    if (!activeTab) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          id,
          user_id,
          plan_id,
          starts_at,
          ends_at,
          status,
          profiles!user_id (
            display_name,
            phone_number
          ),
          subscription_plans!plan_id (
            name,
            price
          )
        `)
        .eq('plan_id', activeTab)
        .order('starts_at', { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map((sub: any) => ({
        id: sub.id,
        user_id: sub.user_id,
        plan_id: sub.plan_id,
        starts_at: sub.starts_at,
        ends_at: sub.ends_at,
        status: sub.status,
        display_name: sub.profiles?.display_name || 'غير معروف',
        phone_number: sub.profiles?.phone_number || '-',
        plan_name: sub.subscription_plans?.name || '-',
        plan_price: sub.subscription_plans?.price || '0',
      }));

      setSubscribers(formattedData);
    } catch (error) {
      console.error('Error loading subscribers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = (endsAt: string) => {
    const end = new Date(endsAt);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      active: { text: 'نشط', color: 'bg-emerald-100 text-emerald-700' },
      paused: { text: 'متوقف', color: 'bg-yellow-100 text-yellow-700' },
      expired: { text: 'منتهي', color: 'bg-red-100 text-red-700' },
    };
    const statusInfo = statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  };

  const handleAction = async (
    action: 'upgrade_silver' | 'upgrade_gold' | 'downgrade_silver' | 'downgrade_free' | 'extend' | 'pause',
    subscriberId: string,
    currentPlanId: string
  ) => {
    try {
      let updates: any = {};

      switch (action) {
        case 'upgrade_silver':
          const silverPlan = plans.find((p) => parseFloat(p.price) === 20);
          if (silverPlan) updates = { plan_id: silverPlan.id };
          break;
        case 'upgrade_gold':
          const goldPlan = plans.find((p) => parseFloat(p.price) === 49);
          if (goldPlan) updates = { plan_id: goldPlan.id };
          break;
        case 'downgrade_silver':
          const silverPlan2 = plans.find((p) => parseFloat(p.price) === 20);
          if (silverPlan2) updates = { plan_id: silverPlan2.id };
          break;
        case 'downgrade_free':
          const freePlan = plans.find((p) => parseFloat(p.price) === 0);
          if (freePlan) updates = { plan_id: freePlan.id };
          break;
        case 'extend':
          const currentSub = subscribers.find((s) => s.id === subscriberId);
          if (currentSub) {
            const newEndDate = new Date(currentSub.ends_at);
            newEndDate.setDate(newEndDate.getDate() + 30);
            updates = { ends_at: newEndDate.toISOString() };
          }
          break;
        case 'pause':
          updates = { status: 'paused' };
          break;
      }

      const { error } = await supabase
        .from('user_subscriptions')
        .update(updates)
        .eq('id', subscriberId);

      if (error) throw error;

      await loadSubscribers();
      setActionMenuOpen(null);
    } catch (error) {
      console.error('Error performing action:', error);
      alert('حدث خطأ أثناء تنفيذ العملية');
    }
  };

  const getAvailableActions = (planPrice: string) => {
    const price = parseFloat(planPrice);

    if (price === 0) {
      return [
        { id: 'upgrade_silver', label: 'ترقية للفضية', icon: ArrowUp, color: 'text-blue-600' },
        { id: 'upgrade_gold', label: 'ترقية للذهبية', icon: ArrowUp, color: 'text-yellow-600' },
        { id: 'extend', label: 'تمديد', icon: Calendar, color: 'text-emerald-600' },
        { id: 'pause', label: 'إيقاف مؤقت', icon: Pause, color: 'text-orange-600' },
      ];
    } else if (price === 20) {
      return [
        { id: 'upgrade_gold', label: 'ترقية للذهبية', icon: ArrowUp, color: 'text-yellow-600' },
        { id: 'downgrade_free', label: 'تنزيل للمجانية', icon: ArrowDown, color: 'text-gray-600' },
        { id: 'extend', label: 'تمديد', icon: Calendar, color: 'text-emerald-600' },
        { id: 'pause', label: 'إيقاف مؤقت', icon: Pause, color: 'text-orange-600' },
      ];
    } else {
      return [
        { id: 'downgrade_silver', label: 'تنزيل للفضية', icon: ArrowDown, color: 'text-gray-600' },
        { id: 'downgrade_free', label: 'تنزيل للمجانية', icon: ArrowDown, color: 'text-gray-600' },
        { id: 'extend', label: 'تمديد', icon: Calendar, color: 'text-emerald-600' },
        { id: 'pause', label: 'إيقاف مؤقت', icon: Pause, color: 'text-orange-600' },
      ];
    }
  };

  const currentPlan = plans.find((p) => p.id === activeTab);

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 font-medium"
      >
        <ChevronRight className="w-5 h-5" />
        العودة للباقات
      </button>

      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">مراجعة المشتركين</h3>

        {/* Tabs */}
        <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2">
          {plans.map((plan) => {
            const isActive = plan.id === activeTab;
            const planColor =
              parseFloat(plan.price) === 0
                ? 'gray'
                : parseFloat(plan.price) === 20
                ? 'blue'
                : 'yellow';

            return (
              <button
                key={plan.id}
                onClick={() => setActiveTab(plan.id)}
                className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? `bg-${planColor}-500 text-white shadow-lg`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {plan.name}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-500 mt-4">جاري تحميل المشتركين...</p>
          </div>
        ) : subscribers.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <p className="text-gray-500 font-medium">لا يوجد مشتركين في هذه الباقة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">الاسم</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">رقم الجوال</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">تاريخ البداية</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">تاريخ النهاية</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">الأيام المتبقية</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">الحالة</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {subscribers.map((sub) => {
                  const daysRemaining = getDaysRemaining(sub.ends_at);
                  const actions = getAvailableActions(sub.plan_price);

                  return (
                    <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 text-sm font-medium text-gray-800">
                        {sub.display_name}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">{sub.phone_number}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {formatDate(sub.starts_at)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {formatDate(sub.ends_at)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span
                            className={`text-sm font-bold ${
                              daysRemaining <= 7
                                ? 'text-red-600'
                                : daysRemaining <= 14
                                ? 'text-yellow-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {daysRemaining} يوم
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">{getStatusBadge(sub.status)}</td>
                      <td className="px-4 py-4">
                        <div className="relative">
                          <button
                            onClick={() =>
                              setActionMenuOpen(actionMenuOpen === sub.id ? null : sub.id)
                            }
                            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-600" />
                          </button>

                          {actionMenuOpen === sub.id && (
                            <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border-2 border-gray-200 z-10 overflow-hidden">
                              {actions.map((action) => (
                                <button
                                  key={action.id}
                                  onClick={() =>
                                    handleAction(
                                      action.id as any,
                                      sub.id,
                                      sub.plan_id
                                    )
                                  }
                                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-all ${action.color}`}
                                >
                                  <action.icon className="w-4 h-4" />
                                  <span className="text-sm font-medium">{action.label}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
