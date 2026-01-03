import { useState, useEffect } from 'react';
import {
  Settings,
  FileText,
  Sliders,
  TrendingDown,
  MessageSquare,
  Save,
  RefreshCw,
  Plus,
  X,
  Info,
  CheckCircle,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { useB2FSettings } from '../../../hooks/useB2FSettings';

type SettingsSubTab = 'general';

export default function SettingsTab() {
  const { settings, loading, saving, saveSettings } = useB2FSettings();
  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>('general');

  const [formData, setFormData] = useState(settings);
  const [showSuccess, setShowSuccess] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSave = async () => {
    const result = await saveSettings(formData);
    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const addCategory = () => {
    if (newCategory.trim()) {
      setFormData({
        ...formData,
        slider_categories: [...formData.slider_categories, newCategory.trim()]
      });
      setNewCategory('');
    }
  };

  const removeCategory = (index: number) => {
    setFormData({
      ...formData,
      slider_categories: formData.slider_categories.filter((_, i) => i !== index)
    });
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newCategories = [...formData.slider_categories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex >= 0 && targetIndex < newCategories.length) {
      [newCategories[index], newCategories[targetIndex]] =
      [newCategories[targetIndex], newCategories[index]];

      setFormData({
        ...formData,
        slider_categories: newCategories
      });
    }
  };

  const subTabs = [
    {
      id: 'general' as SettingsSubTab,
      title: 'الإعدادات العامة',
      icon: Settings,
      gradient: 'from-slate-500 to-slate-700'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-slate-500 mx-auto mb-4" />
          <p className="text-sm text-gray-600 font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all duration-300 ${
                isActive
                  ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg`
                  : 'text-gray-600 hover:bg-white hover:shadow'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.title}</span>
            </button>
          );
        })}
      </div>

      <>
          {showSuccess && (
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 shadow-lg animate-in slide-in-from-top">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold mb-0.5">تم الحفظ بنجاح</p>
                  <p className="text-white/90 text-sm">جميع الإعدادات محفوظة ومفعّلة الآن</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-6 border border-blue-100 shadow-md">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Info className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-black text-blue-900 mb-2">
                  مركز التحكم الشامل
                </h4>
                <p className="text-sm text-blue-800 leading-relaxed">
                  جميع النصوص والقيم المعدلة هنا تنعكس مباشرة على واجهات المستخدم والعقود والشهادات
                </p>
              </div>
            </div>
          </div>

          <div className="group bg-white rounded-3xl border-2 border-violet-100 overflow-hidden hover:shadow-2xl hover:border-violet-200 transition-all duration-300">
            <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    إعدادات العقد الأساسية
                  </h3>
                  <p className="text-sm text-violet-100">
                    معلومات تظهر في العقود والشهادات
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-500"></div>
                  مدة العقد الافتراضية (بالسنوات)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.contract_default_duration_years}
                  onChange={(e) => setFormData({
                    ...formData,
                    contract_default_duration_years: parseInt(e.target.value) || 1
                  })}
                  className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all text-lg font-semibold text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  تُستخدم في حساب مدة العقد ونصوص التوضيح
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-500"></div>
                  نص توضيح أن المبلغ يشمل كامل المدة
                </label>
                <textarea
                  rows={3}
                  value={formData.contract_amount_explanation_text}
                  onChange={(e) => setFormData({
                    ...formData,
                    contract_amount_explanation_text: e.target.value
                  })}
                  className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all resize-none text-gray-900"
                  placeholder="مثال: المبلغ يمثل قيمة الاستثمار لمدة 10 سنوات كاملة..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  يظهر في شاشة التفاصيل والعقد
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-500"></div>
                  نص الموافقة (checkbox العقد)
                </label>
                <textarea
                  rows={3}
                  value={formData.contract_agreement_checkbox_text}
                  onChange={(e) => setFormData({
                    ...formData,
                    contract_agreement_checkbox_text: e.target.value
                  })}
                  className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all resize-none text-gray-900"
                  placeholder="مثال: أقر أنني اطلعت على بنود العقد..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  يظهر بجانب checkbox الموافقة على العقد
                </p>
              </div>
            </div>
          </div>

          <div className="group bg-white rounded-3xl border-2 border-amber-100 overflow-hidden hover:shadow-2xl hover:border-amber-200 transition-all duration-300">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Sliders className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    إعدادات واجهة السليدر
                  </h3>
                  <p className="text-sm text-amber-100">
                    التحكم بعرض الفئات والنصوص
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                  نص التعريف بالقسم
                </label>
                <textarea
                  rows={3}
                  value={formData.section_intro_text}
                  onChange={(e) => setFormData({
                    ...formData,
                    section_intro_text: e.target.value
                  })}
                  className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all resize-none text-gray-900"
                  placeholder="مثال: هنا يمكنك استئجار أشجار مثمرة..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  يظهر عند الضغط على أيقونة التعريف
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                  فئات الأشجار في السليدر
                </label>

                <div className="space-y-2.5 mb-4">
                  {formData.slider_categories.map((category, index) => (
                    <div
                      key={index}
                      className="group/item flex items-center gap-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border-2 border-gray-200 hover:border-amber-300 hover:shadow-md transition-all"
                    >
                      <div className="flex-1">
                        <span className="text-sm text-gray-900 font-semibold">
                          {category}
                        </span>
                        <p className="text-xs text-gray-500 mt-0.5">
                          الترتيب: {index + 1} من {formData.slider_categories.length}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {index > 0 && (
                          <button
                            onClick={() => moveCategory(index, 'up')}
                            className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors"
                            title="تحريك لأعلى"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                        )}

                        {index < formData.slider_categories.length - 1 && (
                          <button
                            onClick={() => moveCategory(index, 'down')}
                            className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors"
                            title="تحريك لأسفل"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        )}

                        {formData.slider_categories.length > 2 && (
                          <button
                            onClick={() => removeCategory(index)}
                            className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
                            title="حذف"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                    placeholder="أضف فئة جديدة..."
                    className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm font-medium"
                  />
                  <button
                    onClick={addCategory}
                    disabled={!newCategory.trim()}
                    className="px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-bold shadow-lg hover:shadow-xl"
                  >
                    <Plus className="w-5 h-5" />
                    <span>إضافة</span>
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-3">
                  يمكنك ترتيب الفئات بالضغط على الأسهم
                </p>
              </div>
            </div>
          </div>

          <div className="group bg-white rounded-3xl border-2 border-blue-100 overflow-hidden hover:shadow-2xl hover:border-blue-200 transition-all duration-300">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    الحدود الافتراضية
                  </h3>
                  <p className="text-sm text-blue-100">
                    قيود الحجز والمبالغ
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    أقل عدد أشجار
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.min_trees_per_request}
                    onChange={(e) => setFormData({
                      ...formData,
                      min_trees_per_request: parseInt(e.target.value) || 1
                    })}
                    className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg font-semibold text-gray-900"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    أقصى عدد أشجار
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_trees_per_request}
                    onChange={(e) => setFormData({
                      ...formData,
                      max_trees_per_request: parseInt(e.target.value) || 1
                    })}
                    className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg font-semibold text-gray-900"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    الحد الأدنى لقيمة الاستثمار (ريال)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formData.min_investment_amount}
                    onChange={(e) => setFormData({
                      ...formData,
                      min_investment_amount: parseInt(e.target.value) || 0
                    })}
                    className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg font-semibold text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    اختياري - للتحذير فقط
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="group bg-white rounded-3xl border-2 border-emerald-100 overflow-hidden hover:shadow-2xl hover:border-emerald-200 transition-all duration-300">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    نصوص واجهة المستثمر
                  </h3>
                  <p className="text-sm text-emerald-100">
                    رسائل النجاح والتأكيد
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  نص نجاح تقديم الطلب
                </label>
                <textarea
                  rows={2}
                  value={formData.success_request_submitted_text}
                  onChange={(e) => setFormData({
                    ...formData,
                    success_request_submitted_text: e.target.value
                  })}
                  className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none text-gray-900"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  نص تفعيل العقد
                </label>
                <textarea
                  rows={2}
                  value={formData.success_contract_created_text}
                  onChange={(e) => setFormData({
                    ...formData,
                    success_contract_created_text: e.target.value
                  })}
                  className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none text-gray-900"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  نص رفع الإيصال
                </label>
                <textarea
                  rows={2}
                  value={formData.success_receipt_uploaded_text}
                  onChange={(e) => setFormData({
                    ...formData,
                    success_receipt_uploaded_text: e.target.value
                  })}
                  className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none text-gray-900"
                />
              </div>
            </div>
          </div>

          <div className="group bg-white rounded-3xl border-2 border-gray-200 overflow-hidden hover:shadow-2xl hover:border-gray-300 transition-all duration-300">
            <div className="bg-gradient-to-r from-gray-600 to-gray-700 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    معلومات التواصل
                  </h3>
                  <p className="text-sm text-gray-200">
                    بيانات الاتصال بالدعم
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({
                    ...formData,
                    contact_email: e.target.value
                  })}
                  className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all text-gray-900 font-medium"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                  رقم الهاتف
                </label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({
                    ...formData,
                    contact_phone: e.target.value
                  })}
                  className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all text-gray-900 font-medium"
                />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-5 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="text-base font-black text-white mb-2">
                  تنبيه هام
                </h4>
                <p className="text-sm text-white/95 leading-relaxed">
                  أي تعديل هنا سينعكس مباشرة على جميع الواجهات المرتبطة بقسم استثمار الأشجار
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-white rounded-2xl py-5 px-6 font-black text-lg hover:from-emerald-700 hover:via-teal-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xl hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
          >
            {saving ? (
              <>
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save className="w-6 h-6" />
                <span>حفظ جميع الإعدادات</span>
                <Sparkles className="w-5 h-5" />
              </>
            )}
          </button>
        </>
    </div>
  );
}
