import { useState, useEffect } from 'react';
import { ArrowRight, Check, Upload, Sparkles, Clock, CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { SmartSubscriptionUpload } from './SmartSubscriptionUpload';
import { PlanToolsShowcase } from './PlanToolsShowcase';
import { supabase } from '../lib/supabase';

interface SubscriptionsViewProps {
  onBack: () => void;
}

export function SubscriptionsView({ onBack }: SubscriptionsViewProps) {
  const { plans, transfers, loading, createTransfer, uploadReceipt, analyzeReceipt } = useSubscriptions();
  const [step, setStep] = useState<'plans' | 'bank-info' | 'upload' | 'confirmation'>('plans');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [currentTransferId, setCurrentTransferId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showSmartUpload, setShowSmartUpload] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<any>(null);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
    loadActiveSubscription();
  }, []);

  const loadPlans = async () => {
    const { data } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price');

    if (data) setAvailablePlans(data);
  };

  const loadActiveSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_subscriptions')
      .select('*, subscription_plans(*)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gt('end_date', new Date().toISOString())
      .single();

    if (data) setActiveSubscription(data);
  };

  const handleSelectPlan = async (plan: any) => {
    setSelectedPlan(plan);
    if (plan.price === 0) {
      return;
    }
    setShowSmartUpload(true);
  };

  const handleUploadSuccess = () => {
    setShowSmartUpload(false);
    loadActiveSubscription();
    setStep('plans');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTransferId) return;

    setUploading(true);
    const success = await uploadReceipt(currentTransferId, file);
    setUploading(false);

    if (success) {
      setAnalyzing(true);
      await analyzeReceipt(currentTransferId, selectedPlan.price);
      setAnalyzing(false);
      setStep('confirmation');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'matched':
        return <CheckCircle2 className="w-6 h-6 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="w-6 h-6 text-red-600" />;
      default:
        return <Clock className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'matched':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'rejected':
        return 'bg-red-50 border-red-200 text-red-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (step === 'plans') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50" dir="rtl">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex items-center gap-3 shadow-lg sticky top-0 z-10">
          <button
            onClick={onBack}
            className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              باقات الاشتراك الزراعية
            </h2>
            <p className="text-sm text-white/90 mt-1">اختر الباقة المناسبة لك</p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto p-4 md:p-6 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {plans.map((plan, index) => (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl shadow-lg border-2 transition-all hover:scale-105 ${
                  index === 1
                    ? 'border-green-400 transform md:scale-110'
                    : index === 2
                    ? 'border-yellow-400'
                    : 'border-gray-200'
                }`}
              >
                <div className={`p-6 rounded-t-2xl ${
                  index === 0 ? 'bg-gradient-to-r from-gray-100 to-gray-200' :
                  index === 1 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                  'bg-gradient-to-r from-yellow-500 to-orange-500'
                }`}>
                  <div className="text-4xl mb-2">
                    {index === 0 ? '🌱' : index === 1 ? '🌿' : '🌾'}
                  </div>
                  <h3 className={`text-2xl font-bold ${index === 0 ? 'text-gray-800' : 'text-white'}`}>
                    {plan.name_ar}
                  </h3>
                  <p className={`text-sm mt-1 ${index === 0 ? 'text-gray-600' : 'text-white/90'}`}>
                    {plan.description_ar}
                  </p>
                </div>

                <div className="p-6">
                  <div className="text-center mb-6">
                    <div className="text-4xl font-bold text-gray-800">
                      {plan.price === 0 ? 'مجاناً' : `${plan.price} ريال`}
                    </div>
                    {plan.price > 0 && (
                      <div className="text-sm text-gray-500 mt-1">شهرياً</div>
                    )}
                  </div>

                  <div className="space-y-3 mb-6">
                    {plan.features_ar.map((feature: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setExpandedPlanId(expandedPlanId === plan.id ? null : plan.id)}
                    className="w-full py-2 mb-3 rounded-lg font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                  >
                    <span>عرض الأدوات المتاحة</span>
                    {expandedPlanId === plan.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {expandedPlanId === plan.id && (
                    <div className="mb-4 -mx-2">
                      <PlanToolsShowcase
                        planType={index === 0 ? 'free' : index === 1 ? 'silver' : 'gold'}
                        showComparison={true}
                      />
                    </div>
                  )}

                  <button
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full py-3 rounded-xl font-bold transition-all ${
                      index === 0
                        ? 'bg-gray-700 hover:bg-gray-800 text-white'
                        : index === 1
                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
                        : 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg'
                    }`}
                  >
                    {plan.price === 0 ? 'ابدأ مجاناً' : 'اشترك الآن'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'bank-info') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl border-2 border-green-200 p-8">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🏦</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              معلومات التحويل البنكي
            </h2>
            <p className="text-gray-600">حول المبلغ إلى الحساب التالي</p>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 mb-6 border-2 border-green-200">
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">اسم الحساب</div>
                <div className="text-lg font-bold text-gray-800">مؤسسة حصص زراعية للاستثمار</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">البنك</div>
                <div className="text-lg font-bold text-gray-800">الراجحي</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">رقم الآيبان</div>
                <div className="text-lg font-mono font-bold text-gray-800 bg-white px-4 py-2 rounded-lg">
                  SA1234567890123456789012
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">المبلغ المطلوب</div>
                <div className="text-2xl font-bold text-green-700">{selectedPlan?.price} ريال</div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <strong>مهم:</strong> اكتب رقم عضويتك في حقل "الوصف" أثناء التحويل
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep('upload')}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg transition-all"
          >
            ✅ لقد حولت المبلغ، أريد رفع الإيصال
          </button>

          <button
            onClick={() => setStep('plans')}
            className="w-full mt-3 text-gray-600 hover:text-gray-800 py-2 text-sm"
          >
            العودة للباقات
          </button>
        </div>
      </div>
    );
  }

  if (step === 'upload') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl border-2 border-blue-200 p-8">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4">
              {analyzing ? (
                <Sparkles className="w-10 h-10 text-white animate-pulse" />
              ) : (
                <Upload className="w-10 h-10 text-white" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {analyzing ? 'جاري التحليل الذكي...' : 'رفع إيصال التحويل'}
            </h2>
            <p className="text-gray-600">
              {analyzing
                ? 'الذكاء المحدود يقوم بتحليل الإيصال الآن'
                : 'ارفع صورة واضحة للإيصال البنكي'}
            </p>
          </div>

          {!uploading && !analyzing && (
            <label className="block">
              <div className="border-4 border-dashed border-blue-300 rounded-2xl p-12 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer">
                <Upload className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                <p className="text-lg font-bold text-gray-700 mb-2">
                  اسحب الإيصال هنا أو اضغط لاختياره
                </p>
                <p className="text-sm text-gray-500">PNG, JPG, PDF حتى 10MB</p>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </label>
          )}

          {(uploading || analyzing) && (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600 font-medium">
                {uploading ? 'جاري رفع الإيصال...' : 'جاري التحليل بالذكاء الصناعي...'}
              </p>
              {analyzing && (
                <div className="mt-4 bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                  <p className="text-sm text-blue-700">
                    ⚡ يتم الآن قراءة المبلغ والتاريخ والتحقق من الشعار...
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'confirmation') {
    const transfer = transfers.find(t => t.id === currentTransferId);

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl border-2 border-green-200 p-8">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              تم إرسال إيصالك للتحقق
            </h2>
            <p className="text-gray-600">سيتم مراجعته خلال دقائق</p>
          </div>

          {transfer && (
            <>
              <div className="bg-gray-50 rounded-xl p-6 mb-6 border-2 border-gray-200">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">رقم التتبع</div>
                    <div className="text-lg font-mono font-bold text-gray-800">
                      {transfer.tracking_number}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">الحالة</div>
                    <div className="text-lg font-bold text-blue-600">قيد المراجعة</div>
                  </div>
                </div>

                {transfer.ai_notes && (
                  <div className={`rounded-xl p-4 border-2 ${getStatusColor(transfer.ai_status)}`}>
                    <div className="flex items-start gap-3 mb-2">
                      {getStatusIcon(transfer.ai_status)}
                      <div className="flex-1">
                        <div className="font-bold mb-1">تحليل الذكاء المحدود:</div>
                        <p className="text-sm">{transfer.ai_notes}</p>
                      </div>
                    </div>
                    <div className="mt-3 text-sm">
                      <strong>درجة الثقة:</strong> {transfer.ai_confidence}%
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={onBack}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg transition-all"
              >
                العودة للرئيسية
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {showSmartUpload && selectedPlan && (
        <SmartSubscriptionUpload
          planId={selectedPlan.id}
          planName={selectedPlan.name}
          planPrice={selectedPlan.price}
          onSuccess={handleUploadSuccess}
          onCancel={() => setShowSmartUpload(false)}
        />
      )}
      {!showSmartUpload && step === 'plans' && (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50" dir="rtl">
          <div className="bg-gradient-to-r from-emerald-600 to-green-600 p-4 flex items-center gap-3 shadow-lg sticky top-0 z-10">
            <button
              onClick={onBack}
              className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
            >
              <ArrowRight className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6" />
                الباقات الذكية
              </h2>
              <p className="text-sm text-white/90 mt-1">تفعيل فوري بالذكاء الصناعي</p>
            </div>
          </div>

          <div className="max-w-6xl mx-auto p-4 md:p-6 pb-20">
            {activeSubscription && (
              <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg p-6 mb-6 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                  <div>
                    <h3 className="text-xl font-bold">باقتك النشطة</h3>
                    <p className="text-sm opacity-90">
                      {activeSubscription.subscription_plans.name === 'silver' ? 'الباقة الفضية' : 'الباقة الذهبية'}
                    </p>
                  </div>
                </div>
                <p className="text-sm opacity-90">
                  صالحة حتى: {new Date(activeSubscription.end_date).toLocaleDateString('ar-SA')}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {availablePlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`bg-white rounded-2xl shadow-lg border-2 transition-all hover:scale-105 ${
                    plan.name === 'gold'
                      ? 'border-yellow-400 transform scale-105'
                      : 'border-gray-300'
                  }`}
                >
                  <div
                    className={`p-6 rounded-t-2xl ${
                      plan.name === 'silver'
                        ? 'bg-gradient-to-r from-gray-300 to-gray-400'
                        : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                    }`}
                  >
                    <div className="text-4xl mb-2">
                      {plan.name === 'silver' ? '🥈' : '🥇'}
                    </div>
                    <h3 className="text-2xl font-bold text-white">
                      الباقة {plan.name === 'silver' ? 'الفضية' : 'الذهبية'}
                    </h3>
                    <p className="text-sm mt-1 text-white/90">
                      {plan.name === 'silver' ? 'للمستخدمين المتوسطين' : 'للمستخدمين المحترفين'}
                    </p>
                  </div>

                  <div className="p-6">
                    <div className="text-center mb-6">
                      <div className="text-4xl font-bold text-gray-800">
                        {plan.price} ريال
                      </div>
                      <div className="text-sm text-gray-500 mt-1">شهرياً</div>
                    </div>

                    <div className="space-y-3 mb-6">
                      {Array.isArray(plan.features) && plan.features.map((feature: string, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700 text-sm">
                            {feature === 'extend_auction' && 'تمديد المزاد'}
                            {feature === 'repost_auction' && 'إعادة نشر المزاد'}
                            {feature === 'smart_assistant' && 'المساعد الذكي'}
                            {feature === 'performance_metrics' && 'مؤشرات الأداء'}
                            {feature === 'priority_support' && 'دعم فني مميز'}
                            {feature === 'advanced_analytics' && 'تحليلات متقدمة'}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => handleSelectPlan(plan)}
                      className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                        plan.name === 'silver'
                          ? 'bg-gray-600 hover:bg-gray-700 text-white'
                          : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg'
                      }`}
                    >
                      <Sparkles className="w-5 h-5" />
                      تفعيل ذكي فوري
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
