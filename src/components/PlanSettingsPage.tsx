import { useState } from 'react';
import { ChevronRight, Save, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Palette } from 'lucide-react';

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
  is_active: boolean;
  has_free_trial: boolean;
  free_trial_days: number;
  features: any[];
  features_ar: string[];
}

interface PlanSettingsPageProps {
  plan: Plan;
  onBack: () => void;
  onSave: (updatedPlan: Partial<Plan>) => void;
}

export function PlanSettingsPage({ plan, onBack, onSave }: PlanSettingsPageProps) {
  const [formData, setFormData] = useState({
    name: plan.name,
    name_ar: plan.name_ar || plan.name,
    description: plan.description || '',
    description_ar: plan.description_ar || '',
    price: plan.price,
    duration_days: plan.duration_days,
    badge: plan.badge || '',
    color: plan.color,
    is_active: plan.is_active,
    has_free_trial: plan.has_free_trial || false,
    free_trial_days: plan.free_trial_days || 0,
  });

  const [features, setFeatures] = useState<Array<{ id: string; text: string; enabled: boolean }>>(
    plan.features || []
  );
  const [featuresAr, setFeaturesAr] = useState<string[]>(plan.features_ar || []);
  const [newFeature, setNewFeature] = useState('');
  const [newFeatureAr, setNewFeatureAr] = useState('');
  const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null);
  const [editingFeatureText, setEditingFeatureText] = useState('');
  const [editingFeatureArIndex, setEditingFeatureArIndex] = useState<number | null>(null);
  const [editingFeatureArText, setEditingFeatureArText] = useState('');

  const isPaidPlan = parseFloat(plan.price) > 0;

  const handleSave = () => {
    onSave({
      ...formData,
      features,
      features_ar: featuresAr,
    });
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFeatures([
        ...features,
        {
          id: Date.now().toString(),
          text: newFeature.trim(),
          enabled: true,
        },
      ]);
      setNewFeature('');
    }
  };

  const deleteFeature = (id: string) => {
    setFeatures(features.filter((f) => f.id !== id));
  };

  const toggleFeature = (id: string) => {
    setFeatures(
      features.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
  };

  const startEditFeature = (id: string, text: string) => {
    setEditingFeatureId(id);
    setEditingFeatureText(text);
  };

  const saveEditFeature = () => {
    if (editingFeatureText.trim() && editingFeatureId) {
      setFeatures(
        features.map((f) =>
          f.id === editingFeatureId ? { ...f, text: editingFeatureText.trim() } : f
        )
      );
      setEditingFeatureId(null);
      setEditingFeatureText('');
    }
  };

  const addFeatureAr = () => {
    if (newFeatureAr.trim()) {
      setFeaturesAr([...featuresAr, newFeatureAr.trim()]);
      setNewFeatureAr('');
    }
  };

  const deleteFeatureAr = (index: number) => {
    setFeaturesAr(featuresAr.filter((_, i) => i !== index));
  };

  const startEditFeatureAr = (index: number, text: string) => {
    setEditingFeatureArIndex(index);
    setEditingFeatureArText(text);
  };

  const saveEditFeatureAr = () => {
    if (editingFeatureArText.trim() && editingFeatureArIndex !== null) {
      setFeaturesAr(
        featuresAr.map((f, i) =>
          i === editingFeatureArIndex ? editingFeatureArText.trim() : f
        )
      );
      setEditingFeatureArIndex(null);
      setEditingFeatureArText('');
    }
  };

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
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-800">إعدادات الباقة</h3>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-3 rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg font-medium"
          >
            <Save className="w-5 h-5" />
            حفظ التغييرات
          </button>
        </div>

        {/* الإعدادات الأساسية */}
        <div className="mb-8">
          <h4 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">
            الإعدادات الأساسية
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* اسم الباقة بالإنجليزية */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم الباقة (English)
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                placeholder="Example: Gold Plan"
              />
            </div>

            {/* اسم الباقة بالعربية */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم الباقة (العربية) 🌟
              </label>
              <input
                type="text"
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                placeholder="مثال: ذهبية"
              />
            </div>

            {/* السعر */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                سعر الباقة (ر.س)
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>

            {/* مدة الباقة */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                مدة الباقة (بالأيام)
              </label>
              <input
                type="number"
                value={formData.duration_days}
                onChange={(e) =>
                  setFormData({ ...formData, duration_days: parseInt(e.target.value) || 0 })
                }
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                placeholder="30"
                min="1"
              />
            </div>

            {/* شارة الباقة */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                شارة الباقة
              </label>
              <input
                type="text"
                value={formData.badge}
                onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                placeholder="مثال: الأكثر شعبية"
              />
            </div>

            {/* لون الباقة */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                لون الباقة
              </label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-16 h-12 border-2 border-gray-200 rounded-xl cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                  placeholder="#10b981"
                />
              </div>
            </div>

            {/* حالة الباقة */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                حالة الباقة
              </label>
              <button
                onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all w-full ${
                  formData.is_active
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                    : 'bg-gray-50 border-gray-300 text-gray-600'
                }`}
              >
                {formData.is_active ? (
                  <ToggleRight className="w-6 h-6" />
                ) : (
                  <ToggleLeft className="w-6 h-6" />
                )}
                <span className="font-medium">
                  {formData.is_active ? 'مفعّلة' : 'معطّلة'}
                </span>
              </button>
            </div>
          </div>

          {/* الوصف بالإنجليزية */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              وصف مختصر (English)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none resize-none"
              rows={3}
              placeholder="Short description..."
            />
          </div>

          {/* الوصف بالعربية */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              وصف مختصر (العربية) 🌟
            </label>
            <textarea
              value={formData.description_ar}
              onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none resize-none"
              rows={3}
              placeholder="وصف قصير للباقة بالعربية..."
            />
          </div>
        </div>

        {/* التجربة المجانية */}
        {isPaidPlan && (
          <div className="mb-8">
            <h4 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">
              التجربة المجانية
            </h4>

            <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h5 className="font-bold text-gray-800 mb-1">تفعيل التجربة المجانية</h5>
                  <p className="text-sm text-gray-600">
                    السماح للمستخدمين بتجربة الباقة مجاناً قبل الاشتراك
                  </p>
                </div>
                <button
                  onClick={() =>
                    setFormData({ ...formData, has_free_trial: !formData.has_free_trial })
                  }
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-medium ${
                    formData.has_free_trial
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {formData.has_free_trial ? (
                    <ToggleRight className="w-5 h-5" />
                  ) : (
                    <ToggleLeft className="w-5 h-5" />
                  )}
                  {formData.has_free_trial ? 'مفعّل' : 'معطّل'}
                </button>
              </div>

              {formData.has_free_trial && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    عدد أيام التجربة
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[7, 14, 30].map((days) => (
                      <button
                        key={days}
                        onClick={() => setFormData({ ...formData, free_trial_days: days })}
                        className={`py-3 rounded-xl font-bold transition-all ${
                          formData.free_trial_days === days
                            ? 'bg-blue-500 text-white shadow-lg'
                            : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        {days} يوم
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* قائمة المميزات */}
        <div>
          <h4 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">
            مميزات الباقة
          </h4>

          {/* إضافة ميزة جديدة */}
          <div className="mb-6">
            <div className="flex gap-3">
              <input
                type="text"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                placeholder="اكتب ميزة جديدة..."
              />
              <button
                onClick={addFeature}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg font-medium"
              >
                <Plus className="w-5 h-5" />
                إضافة
              </button>
            </div>
          </div>

          {/* قائمة المميزات */}
          <div className="space-y-3">
            {features.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <p className="text-gray-500 font-medium">لا توجد مميزات حتى الآن</p>
                <p className="text-sm text-gray-400 mt-1">اضغط "إضافة" لإضافة ميزة جديدة</p>
              </div>
            ) : (
              features.map((feature) => (
                <div
                  key={feature.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    feature.enabled
                      ? 'bg-white border-gray-200'
                      : 'bg-gray-50 border-gray-300 opacity-60'
                  }`}
                >
                  {editingFeatureId === feature.id ? (
                    <>
                      <input
                        type="text"
                        value={editingFeatureText}
                        onChange={(e) => setEditingFeatureText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && saveEditFeature()}
                        className="flex-1 px-3 py-2 border-2 border-blue-500 rounded-lg focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={saveEditFeature}
                        className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all font-medium"
                      >
                        حفظ
                      </button>
                      <button
                        onClick={() => setEditingFeatureId(null)}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all font-medium"
                      >
                        إلغاء
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-gray-800 font-medium">{feature.text}</span>
                      <button
                        onClick={() => toggleFeature(feature.id)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                          feature.enabled
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {feature.enabled ? 'مفعّل' : 'معطّل'}
                      </button>
                      <button
                        onClick={() => startEditFeature(feature.id, feature.text)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteFeature(feature.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* قائمة المميزات بالعربية */}
        <div className="mt-8 pt-8 border-t-2 border-gray-200">
          <h4 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b-2 border-emerald-200 flex items-center gap-2">
            مميزات الباقة (العربية) 🌟
          </h4>

          {/* إضافة ميزة جديدة بالعربية */}
          <div className="mb-6">
            <div className="flex gap-3">
              <input
                type="text"
                value={newFeatureAr}
                onChange={(e) => setNewFeatureAr(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addFeatureAr()}
                className="flex-1 px-4 py-3 border-2 border-emerald-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                placeholder="اكتب ميزة جديدة بالعربية..."
                dir="rtl"
              />
              <button
                onClick={addFeatureAr}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-3 rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg font-medium"
              >
                <Plus className="w-5 h-5" />
                إضافة
              </button>
            </div>
          </div>

          {/* قائمة المميزات بالعربية */}
          <div className="space-y-3">
            {featuresAr.length === 0 ? (
              <div className="text-center py-12 bg-emerald-50 rounded-xl border-2 border-dashed border-emerald-300">
                <p className="text-gray-500 font-medium">لا توجد مميزات بالعربية حتى الآن</p>
                <p className="text-sm text-gray-400 mt-1">اضغط "إضافة" لإضافة ميزة جديدة</p>
              </div>
            ) : (
              featuresAr.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 bg-white border-emerald-200 transition-all"
                >
                  {editingFeatureArIndex === index ? (
                    <>
                      <input
                        type="text"
                        value={editingFeatureArText}
                        onChange={(e) => setEditingFeatureArText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && saveEditFeatureAr()}
                        className="flex-1 px-3 py-2 border-2 border-emerald-500 rounded-lg focus:outline-none"
                        dir="rtl"
                        autoFocus
                      />
                      <button
                        onClick={saveEditFeatureAr}
                        className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all font-medium"
                      >
                        حفظ
                      </button>
                      <button
                        onClick={() => setEditingFeatureArIndex(null)}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all font-medium"
                      >
                        إلغاء
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-gray-800 font-medium" dir="rtl">{feature}</span>
                      <button
                        onClick={() => startEditFeatureAr(index, feature)}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteFeatureAr(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
