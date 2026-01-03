import { useState, useEffect } from 'react';
import { Package, X, Settings, Users, Crown, Sparkles, Calendar, BarChart3, Brain } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PlanSettingsPage } from './PlanSettingsPage';
import { SubscribersReviewPage } from './SubscribersReviewPage';
import { SubscriptionDashboard } from './SubscriptionDashboard';
import { AIControlPanel } from './AIControlPanel';

interface PlansManagementNewProps {
  onClose: () => void;
}

type ViewType = 'main' | 'settings' | 'review' | 'dashboard' | 'ai';

interface Plan {
  id: string;
  name: string;
  name_ar: string;
  description: string | null;
  description_ar: string | null;
  price: string;
  duration_days: number;
  badge: string | null;
  color: string;
  plan_type: 'free' | 'silver' | 'gold';
  is_active: boolean;
  has_free_trial: boolean;
  free_trial_days: number;
  features: any[];
  features_ar: string[];
  subscribers_count: number;
}

export function PlansManagementNew({ onClose }: PlansManagementNewProps) {
  const [currentView, setCurrentView] = useState<ViewType>('main');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select(`
          id,
          name,
          name_ar,
          description,
          description_ar,
          price,
          duration_days,
          badge,
          color,
          plan_type,
          is_active,
          has_free_trial,
          free_trial_days,
          features,
          features_ar
        `)
        .order('price');

      if (error) throw error;

      const plansWithCounts = await Promise.all(
        (data || []).map(async (plan) => {
          const { count } = await supabase
            .from('user_subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('plan_id', plan.id);

          return {
            ...plan,
            subscribers_count: count || 0,
          };
        })
      );

      setPlans(plansWithCounts);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async (updatedPlan: Partial<Plan>) => {
    if (!selectedPlan) return;

    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update(updatedPlan)
        .eq('id', selectedPlan.id);

      if (error) throw error;

      await loadPlans();

      setCurrentView('main');
      setSelectedPlan(null);

      alert('تم حفظ التغييرات بنجاح! ✅');
    } catch (error) {
      console.error('Error updating plan:', error);
      alert('حدث خطأ أثناء حفظ التغييرات');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Package className="w-7 h-7" />
                إدارة الباقات
              </h2>
              <p className="text-yellow-100 text-sm mt-1">
                {currentView === 'main' && 'عرض وإدارة جميع الباقات'}
                {currentView === 'settings' && 'إعدادات الباقة'}
                {currentView === 'review' && 'مراجعة المشتركين'}
                {currentView === 'dashboard' && 'لوحة قيادة الاشتراكات'}
                {currentView === 'ai' && 'لوحة التحكم في الذكاء الصناعي'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            <button
              onClick={() => setCurrentView('main')}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 whitespace-nowrap ${
                currentView === 'main' ? 'bg-white text-yellow-600 font-bold' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Package className="w-4 h-4" />
              الباقات
            </button>
            <button
              onClick={() => setCurrentView('settings')}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 whitespace-nowrap ${
                currentView === 'settings' ? 'bg-white text-yellow-600 font-bold' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Settings className="w-4 h-4" />
              الإعدادات
            </button>
            <button
              onClick={() => setCurrentView('review')}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 whitespace-nowrap ${
                currentView === 'review' ? 'bg-white text-yellow-600 font-bold' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Users className="w-4 h-4" />
              المشتركين
            </button>
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 whitespace-nowrap ${
                currentView === 'dashboard' ? 'bg-white text-yellow-600 font-bold' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              لوحة القيادة
            </button>
            <button
              onClick={() => setCurrentView('ai')}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 whitespace-nowrap ${
                currentView === 'ai' ? 'bg-white text-yellow-600 font-bold' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Brain className="w-4 h-4" />
              الذكاء الصناعي
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 200px)' }}>
          {currentView === 'main' && (
            <div>
              {loading ? (
                <div className="text-center py-20">
                  <div className="animate-spin w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-gray-500 mt-4">جاري تحميل الباقات...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className="group relative"
                      style={{
                        perspective: '1000px',
                      }}
                    >
                      <div
                        className="relative bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all duration-500 hover:scale-105 hover:shadow-2xl"
                        style={{
                          transformStyle: 'preserve-3d',
                          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                        }}
                      >
                        {/* Header with Color */}
                        <div
                          className="h-32 relative overflow-hidden"
                          style={{
                            background: `linear-gradient(135deg, ${plan.color}, ${plan.color}dd)`,
                          }}
                        >
                          <div className="absolute inset-0 bg-black/10"></div>
                          <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>

                          {/* Badge */}
                          {plan.badge && (
                            <div className="absolute top-3 right-3">
                              <div className="bg-white/95 backdrop-blur-sm text-gray-800 px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                {plan.badge}
                              </div>
                            </div>
                          )}

                          {/* Plan Icon */}
                          <div className="absolute bottom-4 right-4">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg">
                              {plan.price === '0.00' ? (
                                <Package className="w-8 h-8 text-white" />
                              ) : plan.plan_type === 'gold' ? (
                                <Crown className="w-8 h-8 text-white" />
                              ) : (
                                <Sparkles className="w-8 h-8 text-white" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                          {/* Plan Name */}
                          <h3 className="text-2xl font-bold text-gray-800 mb-2">{plan.name_ar || plan.name}</h3>

                          {/* Price */}
                          <div className="mb-4">
                            <div className="flex items-baseline gap-1">
                              <span className="text-4xl font-bold text-gray-900">
                                {plan.price === '0.00' ? 'مجاني' : plan.price}
                              </span>
                              {plan.price !== '0.00' && (
                                <span className="text-gray-500 text-sm">ر.س</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                              <Calendar className="w-4 h-4" />
                              <span>{plan.duration_days} يوم</span>
                            </div>
                          </div>

                          {/* Subscribers Count */}
                          <div className="bg-gray-50 rounded-xl p-3 mb-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-gray-600" />
                                <span className="text-sm text-gray-600">المشتركون</span>
                              </div>
                              <span className="text-xl font-bold text-gray-900">
                                {plan.subscribers_count}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => {
                                setSelectedPlan(plan);
                                setCurrentView('settings');
                              }}
                              className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl font-medium"
                            >
                              <Settings className="w-4 h-4" />
                              الإعدادات
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPlan(plan);
                                setCurrentView('review');
                              }}
                              className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl font-medium"
                            >
                              <Users className="w-4 h-4" />
                              المشتركين
                            </button>
                          </div>
                        </div>

                        {/* 3D Effect Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentView === 'settings' && selectedPlan && (
            <PlanSettingsPage
              plan={selectedPlan}
              onBack={() => {
                setCurrentView('main');
                setSelectedPlan(null);
              }}
              onSave={handleSavePlan}
            />
          )}

          {currentView === 'review' && (
            <SubscribersReviewPage
              plans={plans}
              onBack={() => {
                setCurrentView('main');
                setSelectedPlan(null);
              }}
            />
          )}

          {currentView === 'dashboard' && (
            <div>
              <SubscriptionDashboard />
            </div>
          )}

          {currentView === 'ai' && (
            <div>
              <AIControlPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
