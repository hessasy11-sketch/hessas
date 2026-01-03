import { useState, useEffect } from 'react';
import { X, Save, TreePine, DollarSign, Calendar, Award, Tag, Video, MapPin } from 'lucide-react';
import { Opportunity } from '../../hooks/useOpportunities';
import { useB2FFarms } from '../../hooks/useB2FFarms';
import ImageUploader from './ImageUploader';

interface OpportunityFormModalProps {
  opportunity?: Opportunity | null;
  farmId?: string;
  onClose: () => void;
  onSave: (opportunityData: any) => Promise<{ success: boolean; error?: string }>;
}

export default function OpportunityFormModal({
  opportunity,
  farmId,
  onClose,
  onSave,
}: OpportunityFormModalProps) {
  const { farms, loading: loadingFarms } = useB2FFarms();
  const activeFarms = farms.filter(f => f.is_active === true);

  const [formData, setFormData] = useState({
    farm_id: farmId || '',
    title: '',
    description: '',
    tree_type: 'نخيل' as string,
    custom_tree_type: '',
    investment_type: 'rental',
    available_trees: 100,
    price_per_tree: 189,
    min_trees: 3,
    max_trees: null as number | null,
    contract_duration_years: 10,
    expected_return: 'عائد متوقع: 15-20% سنوياً',
    badge: 'none',
    internal_tag: '',
    video_url: '',
    location_url: '',
    status: 'active',
    images: [] as string[],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedFarm, setSelectedFarm] = useState<any>(null);

  useEffect(() => {
    if (opportunity) {
      const opportunityImages = Array.isArray(opportunity.images)
        ? opportunity.images
        : [];

      setFormData({
        farm_id: opportunity.farm_id,
        title: opportunity.title,
        description: opportunity.description || '',
        tree_type: opportunity.tree_type,
        custom_tree_type: opportunity.custom_tree_type || '',
        investment_type: opportunity.investment_type,
        available_trees: opportunity.available_trees,
        price_per_tree: opportunity.price_per_tree,
        min_trees: opportunity.min_trees,
        max_trees: opportunity.max_trees,
        contract_duration_years: opportunity.contract_duration_years,
        expected_return: opportunity.expected_return || '',
        badge: opportunity.badge,
        internal_tag: opportunity.internal_tag || '',
        video_url: opportunity.video_url || '',
        location_url: opportunity.location_url || '',
        status: opportunity.status,
        images: opportunityImages,
      });
    }
  }, [opportunity]);

  useEffect(() => {
    if (formData.farm_id) {
      const farm = farms.find(f => f.id === formData.farm_id);
      setSelectedFarm(farm);
    }
  }, [formData.farm_id, farms]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.farm_id) {
      setError('يجب اختيار المزرعة');
      return;
    }

    if (!formData.title.trim()) {
      setError('عنوان العرض مطلوب');
      return;
    }

    if (formData.tree_type === 'أخرى' && !formData.custom_tree_type.trim()) {
      setError('يرجى تحديد نوع الأشجار');
      return;
    }

    if (formData.available_trees <= 0) {
      setError('عدد الأشجار يجب أن يكون أكبر من صفر');
      return;
    }

    if (formData.price_per_tree <= 0) {
      setError('السعر يجب أن يكون أكبر من صفر');
      return;
    }

    if (formData.min_trees <= 0) {
      setError('الحد الأدنى يجب أن يكون أكبر من صفر');
      return;
    }

    setSaving(true);

    const result = await onSave(formData);

    setSaving(false);

    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'حدث خطأ أثناء الحفظ');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl sm:rounded-3xl max-w-4xl w-full my-4 sm:my-8 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-4 sm:px-6 py-3 sm:py-4 rounded-t-2xl sm:rounded-t-3xl flex items-center justify-between shadow-lg z-10">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white">
              {opportunity ? 'تعديل العرض الاستثماري' : 'إضافة عرض استثماري جديد'}
            </h2>
            <p className="text-xs sm:text-sm text-white/80 mt-0.5">املأ البيانات بعناية</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all flex items-center justify-center"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 sm:p-6 space-y-4 sm:space-y-5 max-h-[calc(100vh-120px)] overflow-y-auto">
          {error && (
            <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 rounded-xl sm:rounded-2xl p-3 sm:p-4 animate-in slide-in-from-top">
              <p className="text-sm sm:text-base text-red-800 font-semibold">{error}</p>
            </div>
          )}

          {/* ربط العرض بالمزرعة */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-md border-2 border-emerald-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-gray-900">ربط العرض بالمزرعة</h3>
            </div>

            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-gray-700">
                اختيار المزرعة <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.farm_id}
                onChange={(e) => setFormData({ ...formData, farm_id: e.target.value })}
                disabled={loadingFarms}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm sm:text-base font-medium"
              >
                <option value="">-- اختر مزرعة --</option>
                {activeFarms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name} - {farm.location} ({farm.total_trees_available} شجرة)
                  </option>
                ))}
              </select>
            </div>

            {selectedFarm && (
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-3 sm:p-4 text-xs sm:text-sm border border-emerald-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <p className="flex items-center gap-2">
                    <span className="font-bold text-emerald-900">المنطقة:</span>
                    <span className="text-gray-700">{selectedFarm.location}</span>
                  </p>
                  {selectedFarm.city && (
                    <p className="flex items-center gap-2">
                      <span className="font-bold text-emerald-900">المدينة:</span>
                      <span className="text-gray-700">{selectedFarm.city}</span>
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    <span className="font-bold text-emerald-900">إجمالي الأشجار:</span>
                    <span className="text-gray-700">{selectedFarm.total_trees_available.toLocaleString()}</span>
                  </p>
                </div>
                {selectedFarm.description && (
                  <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-emerald-200">{selectedFarm.description}</p>
                )}
              </div>
            )}
          </div>

          {/* بيانات العرض الأساسية */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-md border-2 border-blue-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <TreePine className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-gray-900">بيانات العرض الأساسية</h3>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                  عنوان العرض التسويقي <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="استثمار 10 سنوات في نخيل سكري"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                  وصف مختصر للعرض
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="استثمار طويل الأمد مع إدارة كاملة"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                  نوع الأشجار في هذا العرض
                </label>
                <select
                  value={formData.tree_type}
                  onChange={(e) => setFormData({
                    ...formData,
                    tree_type: e.target.value,
                    custom_tree_type: e.target.value !== 'أخرى' ? '' : formData.custom_tree_type
                  })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base font-medium"
                >
                  <option value="نخيل">نخيل</option>
                  <option value="زيتون">زيتون</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>

              {formData.tree_type === 'أخرى' && (
                <div className="animate-in slide-in-from-top">
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                    اكتب نوع الأشجار <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.custom_tree_type}
                    onChange={(e) => setFormData({ ...formData, custom_tree_type: e.target.value })}
                    placeholder="مثال: مانجو، ليمون، عنب"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  />
                </div>
              )}
            </div>
          </div>

          {/* بيانات الاستثمار */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-md border-2 border-amber-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-gray-900">بيانات الاستثمار الرقمية</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                  مدة العقد (سنوات)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.contract_duration_years}
                  onChange={(e) => setFormData({ ...formData, contract_duration_years: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm sm:text-base font-bold"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                  سعر الشجرة (ريال)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={formData.price_per_tree}
                  onChange={(e) => setFormData({ ...formData, price_per_tree: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm sm:text-base font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                  عدد الأشجار المخصصة لهذا العرض
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.available_trees}
                  onChange={(e) => setFormData({ ...formData, available_trees: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm sm:text-base font-bold"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                  الحد الأدنى للحجز
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.min_trees}
                  onChange={(e) => setFormData({ ...formData, min_trees: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm sm:text-base font-bold"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                  الحد الأقصى (اختياري)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_trees || ''}
                  onChange={(e) => setFormData({ ...formData, max_trees: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="بدون حد"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm sm:text-base"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                  العائد المتوقع
                </label>
                <input
                  type="text"
                  value={formData.expected_return}
                  onChange={(e) => setFormData({ ...formData, expected_return: e.target.value })}
                  placeholder="عائد متوقع 15-20% سنوياً"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm sm:text-base"
                />
              </div>
            </div>
          </div>

          {/* التمييز والتسويق */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-md border-2 border-purple-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                <Award className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-gray-900">عناصر التمييز والتسويق</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                  شارة العرض
                </label>
                <select
                  value={formData.badge}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm sm:text-base font-medium"
                >
                  <option value="none">بدون</option>
                  <option value="exclusive">حصري</option>
                  <option value="featured">مميز</option>
                  <option value="limited">محدود</option>
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                  وسم داخلي
                </label>
                <input
                  type="text"
                  value={formData.internal_tag}
                  onChange={(e) => setFormData({ ...formData, internal_tag: e.target.value })}
                  placeholder="دفعة رمضان"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm sm:text-base"
                />
              </div>
            </div>
          </div>

          {/* صور العرض */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-md border-2 border-indigo-100">
            <ImageUploader
              images={formData.images}
              onChange={(images) => setFormData({ ...formData, images })}
              maxImages={3}
            />
          </div>

          {/* الفيديو والموقع */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-md border-2 border-teal-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg">
                <Video className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-gray-900">روابط إضافية</h3>
            </div>

            <div className="space-y-3 sm:space-y-4">

              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                  رابط فيديو تعريفي
                </label>
                <input
                  type="url"
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                  رابط موقع تقريبي
                </label>
                <input
                  type="url"
                  value={formData.location_url}
                  onChange={(e) => setFormData({ ...formData, location_url: e.target.value })}
                  placeholder="https://maps.google.com/..."
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm sm:text-base"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  موقع تقريبي فقط، لا يكشف الإحداثيات الدقيقة
                </p>
              </div>
            </div>
          </div>

          {/* الحالة */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-md border-2 border-gray-200">
            <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
              حالة العرض
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base font-medium"
            >
              <option value="active">نشط (يظهر للمستثمرين)</option>
              <option value="hidden">مخفي (محفوظ فقط)</option>
              <option value="sold_out">مكتمل (لا يقبل حجوزات)</option>
            </select>
          </div>

          {/* الأزرار */}
          <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-4 -mx-3 sm:-mx-6 px-3 sm:px-6">
            <div className="flex gap-2 sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 sm:px-6 py-3 sm:py-3.5 rounded-xl border-2 border-gray-300 text-gray-700 font-bold hover:bg-gray-50 active:scale-95 transition-all text-sm sm:text-base"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 sm:px-6 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-black hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg text-sm sm:text-base"
              >
                <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                {saving ? 'جاري الحفظ...' : 'حفظ العرض'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
