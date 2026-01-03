import { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Edit,
  Trash2,
  Search,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Calendar,
  Tag,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Save,
  TreePine,
  Upload,
  Image as ImageIcon,
  Star,
  MapPin,
  Activity,
  BarChart3
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Farm {
  id: string;
  name: string;
  region_name: string | null;
  city_name: string | null;
  tree_types: string[];
  max_investable_trees: number;
  is_active: boolean;
  used_capacity: number;
  available_investable_capacity: number;
  occupancy_percentage: number;
  active_opportunities_count: number;
  capacity_status: string;
  images: string[];
  main_image: string | null;
}

interface Opportunity {
  id: string;
  farm_id: string;
  title: string;
  description: string | null;
  rental_features: string | null;
  price_per_tree: number;
  min_trees: number;
  max_trees: number | null;
  number_of_trees: number;
  duration_months: number;
  expected_return: string | null;
  limited_offer_enabled: boolean;
  limited_offer_title: string | null;
  limited_offer_start: string | null;
  limited_offer_end: string | null;
  is_active: boolean;
  display_order: number;
  images: string[];
  created_at: string;
  updated_at: string;
}

interface InvestmentOpportunitiesManagementProps {
  onClose: () => void;
}

export function InvestmentOpportunitiesManagement({ onClose }: InvestmentOpportunitiesManagementProps) {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [opportunities, setOpportunities] = useState<Record<string, Opportunity[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [uploadingImages, setUploadingImages] = useState(false);

  const [formData, setFormData] = useState({
    farm_id: '',
    title: '',
    description: '',
    rental_features: '',
    price_per_tree: 0,
    min_trees: 1,
    max_trees: null as number | null,
    number_of_trees: 0,
    duration_months: 12,
    expected_return: '',
    limited_offer_enabled: false,
    limited_offer_title: '',
    limited_offer_start: '',
    limited_offer_end: '',
    is_active: true,
    display_order: 0,
    images: [] as string[]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: farmsData, error: farmsError } = await supabase
        .from('farms_with_capacity')
        .select('*')
        .order('name');

      if (farmsError) throw farmsError;
      setFarms(farmsData || []);

      const { data: opportunitiesData, error: opportunitiesError } = await supabase
        .from('investment_opportunities')
        .select('*')
        .order('display_order');

      if (opportunitiesError) throw opportunitiesError;

      const groupedOpportunities: Record<string, Opportunity[]> = {};
      (opportunitiesData || []).forEach((opp: Opportunity) => {
        if (!groupedOpportunities[opp.farm_id]) {
          groupedOpportunities[opp.farm_id] = [];
        }
        groupedOpportunities[opp.farm_id].push(opp);
      });

      setOpportunities(groupedOpportunities);
    } catch (err) {
      console.error('Error loading data:', err);
      alert('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const maxImages = 6;
    const currentImagesCount = formData.images.length;

    if (currentImagesCount + files.length > maxImages) {
      alert(`يمكنك رفع ${maxImages} صور كحد أقصى`);
      return;
    }

    try {
      setUploadingImages(true);
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('farm-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('farm-images')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls]
      }));
    } catch (err) {
      console.error('Error uploading images:', err);
      alert('حدث خطأ أثناء رفع الصور');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = (imageUrl: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter(img => img !== imageUrl)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.farm_id) {
      alert('يجب اختيار المزرعة');
      return;
    }

    if (formData.number_of_trees <= 0) {
      alert('يجب تحديد عدد الأشجار');
      return;
    }

    try {
      const dataToSave = {
        farm_id: formData.farm_id,
        title: formData.title,
        description: formData.description || null,
        rental_features: formData.rental_features || null,
        price_per_tree: formData.price_per_tree,
        min_trees: formData.min_trees,
        max_trees: formData.max_trees,
        number_of_trees: formData.number_of_trees,
        duration_months: formData.duration_months,
        expected_return: formData.expected_return || null,
        limited_offer_enabled: formData.limited_offer_enabled,
        limited_offer_title: formData.limited_offer_enabled ? formData.limited_offer_title : null,
        limited_offer_start: formData.limited_offer_enabled ? formData.limited_offer_start : null,
        limited_offer_end: formData.limited_offer_enabled ? formData.limited_offer_end : null,
        is_active: formData.is_active,
        display_order: formData.display_order,
        images: formData.images
      };

      if (editingOpportunity) {
        const { error } = await supabase
          .from('investment_opportunities')
          .update({
            ...dataToSave,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingOpportunity.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('investment_opportunities')
          .insert([dataToSave]);

        if (error) throw error;
      }

      resetForm();
      loadData();
    } catch (err: any) {
      console.error('Error saving opportunity:', err);
      if (err.message && err.message.includes('يتجاوز الطاقة')) {
        alert(err.message);
      } else {
        alert('حدث خطأ أثناء حفظ الفرصة');
      }
    }
  };

  const handleEdit = (opportunity: Opportunity) => {
    setEditingOpportunity(opportunity);
    setFormData({
      farm_id: opportunity.farm_id,
      title: opportunity.title,
      description: opportunity.description || '',
      rental_features: opportunity.rental_features || '',
      price_per_tree: opportunity.price_per_tree,
      min_trees: opportunity.min_trees,
      max_trees: opportunity.max_trees,
      number_of_trees: opportunity.number_of_trees,
      duration_months: opportunity.duration_months,
      expected_return: opportunity.expected_return || '',
      limited_offer_enabled: opportunity.limited_offer_enabled,
      limited_offer_title: opportunity.limited_offer_title || '',
      limited_offer_start: opportunity.limited_offer_start || '',
      limited_offer_end: opportunity.limited_offer_end || '',
      is_active: opportunity.is_active,
      display_order: opportunity.display_order,
      images: opportunity.images || []
    });
    setShowForm(true);
  };

  const handleDelete = async (opportunityId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفرصة؟')) return;

    try {
      const { error } = await supabase
        .from('investment_opportunities')
        .delete()
        .eq('id', opportunityId);

      if (error) throw error;
      loadData();
    } catch (err) {
      console.error('Error deleting opportunity:', err);
      alert('حدث خطأ أثناء حذف الفرصة');
    }
  };

  const toggleStatus = async (opportunity: Opportunity) => {
    try {
      const { error } = await supabase
        .from('investment_opportunities')
        .update({ is_active: !opportunity.is_active })
        .eq('id', opportunity.id);

      if (error) throw error;
      loadData();
    } catch (err: any) {
      console.error('Error toggling status:', err);
      if (err.message && err.message.includes('يتجاوز الطاقة')) {
        alert(err.message);
      } else {
        alert('حدث خطأ أثناء تغيير الحالة');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      farm_id: selectedFarmId || '',
      title: '',
      description: '',
      rental_features: '',
      price_per_tree: 0,
      min_trees: 1,
      max_trees: null,
      number_of_trees: 0,
      duration_months: 12,
      expected_return: '',
      limited_offer_enabled: false,
      limited_offer_title: '',
      limited_offer_start: '',
      limited_offer_end: '',
      is_active: true,
      display_order: 0,
      images: []
    });
    setEditingOpportunity(null);
    setShowForm(false);
  };

  const openFormForFarm = (farmId: string) => {
    setSelectedFarmId(farmId);
    setFormData(prev => ({
      ...prev,
      farm_id: farmId
    }));
    setShowForm(true);
  };

  const getCapacityColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-50 border-green-200 text-green-700';
      case 'high': return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'almost_full': return 'bg-orange-50 border-orange-200 text-orange-700';
      case 'full': return 'bg-red-50 border-red-200 text-red-700';
      case 'inactive': return 'bg-gray-50 border-gray-200 text-gray-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getCapacityBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-600';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-600';
  };

  const getCapacityMessage = (farm: Farm) => {
    if (!farm.is_active) return 'المزرعة متوقفة حالياً';
    if (farm.capacity_status === 'full') return 'الطاقة ممتلئة بالكامل';
    if (farm.capacity_status === 'almost_full') return 'اقتربت الطاقة من الامتلاء - يُنصح بالتخطيط لتوسيع الطاقة';
    if (farm.capacity_status === 'high') return 'الإشغال مرتفع - راقب الطاقة المتبقية';
    return 'الطاقة متاحة';
  };

  const filteredFarms = farms.filter(farm =>
    farm.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedFarm = farms.find(f => f.id === formData.farm_id);
  const availableCapacityForForm = selectedFarm
    ? selectedFarm.available_investable_capacity + (editingOpportunity ? editingOpportunity.number_of_trees : 0)
    : 0;

  const stats = {
    totalFarms: farms.length,
    activeFarms: farms.filter(f => f.is_active).length,
    totalOpportunities: Object.values(opportunities).flat().length,
    activeOpportunities: Object.values(opportunities).flat().filter(o => o.is_active).length
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col">

        <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-8 py-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">إدارة الفرص الاستثمارية</h2>
              <p className="text-amber-100 text-sm mt-1">
                إنشاء وإدارة الفرص الاستثمارية المرتبطة بالمزارع
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-8 py-6 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
              <div className="text-sm text-gray-600 mb-1">إجمالي المزارع</div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalFarms}</div>
              <div className="text-xs text-gray-500 mt-1">({stats.activeFarms} نشطة)</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 border-2 border-amber-200">
              <div className="text-sm text-amber-700 mb-1">إجمالي الفرص</div>
              <div className="text-2xl font-bold text-amber-800">{stats.totalOpportunities}</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
              <div className="text-sm text-green-700 mb-1">فرص نشطة</div>
              <div className="text-2xl font-bold text-green-800">{stats.activeOpportunities}</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
              <div className="text-sm text-blue-700 mb-1">فرص معطلة</div>
              <div className="text-2xl font-bold text-blue-800">{stats.totalOpportunities - stats.activeOpportunities}</div>
            </div>
          </div>
        </div>

        <div className="px-8 py-4 bg-white border-b border-gray-200">
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="بحث بالمزرعة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={loadData}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              تحديث
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-8 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
            </div>
          ) : showForm ? (
            <div className="max-w-5xl mx-auto">
              <div className="bg-white rounded-xl border-2 border-gray-200 p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6">
                  {editingOpportunity ? 'تعديل الفرصة الاستثمارية' : 'إضافة فرصة استثمارية جديدة'}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      المزرعة *
                    </label>
                    <select
                      required
                      value={formData.farm_id}
                      onChange={(e) => setFormData({ ...formData, farm_id: e.target.value })}
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none"
                      disabled={!!editingOpportunity}
                    >
                      <option value="">اختر المزرعة</option>
                      {farms.filter(f => f.is_active).map(farm => (
                        <option key={farm.id} value={farm.id}>
                          {farm.name} - متاح: {farm.available_investable_capacity} شجرة
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedFarm && (
                    <div className={`rounded-xl p-4 border-2 ${getCapacityColor(selectedFarm.capacity_status)}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Activity className="w-5 h-5" />
                          <span className="font-bold">طاقة المزرعة</span>
                        </div>
                        <span className="text-sm font-medium">
                          {selectedFarm.used_capacity} / {selectedFarm.max_investable_trees}
                        </span>
                      </div>
                      <div className="w-full bg-white/50 rounded-full h-2 mb-2">
                        <div
                          className={`h-2 rounded-full transition-all ${getCapacityBarColor(selectedFarm.occupancy_percentage)}`}
                          style={{ width: `${Math.min(selectedFarm.occupancy_percentage, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs flex items-center justify-between">
                        <span>المتاح لهذه الفرصة: <strong>{availableCapacityForForm}</strong> شجرة</span>
                        <span>{selectedFarm.occupancy_percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      عنوان الفرصة *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none"
                      placeholder="مثال: استثمر في نخيل المدينة"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الوصف التسويقي
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none"
                      placeholder="وصف جذاب للفرصة..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      مميزات عرض الإيجار
                    </label>
                    <textarea
                      value={formData.rental_features}
                      onChange={(e) => setFormData({ ...formData, rental_features: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none"
                      placeholder="• نظام ري حديث&#10;• متابعة دورية&#10;• تقارير شهرية"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        عدد الأشجار في هذه الفرصة *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        max={availableCapacityForForm}
                        value={formData.number_of_trees}
                        onChange={(e) => setFormData({ ...formData, number_of_trees: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none"
                        placeholder="0"
                      />
                      {selectedFarm && formData.number_of_trees > availableCapacityForForm && (
                        <p className="text-xs text-red-600 mt-1">يتجاوز الطاقة المتاحة!</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        السعر (ريال/شجرة/سنة) *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        step="0.01"
                        value={formData.price_per_tree}
                        onChange={(e) => setFormData({ ...formData, price_per_tree: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none"
                        placeholder="500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        مدة الاستئجار (بالأشهر) *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={formData.duration_months}
                        onChange={(e) => setFormData({ ...formData, duration_months: parseInt(e.target.value) || 12 })}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none"
                        placeholder="12"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الحد الأدنى للحجز
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.min_trees}
                        onChange={(e) => setFormData({ ...formData, min_trees: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الحد الأقصى للحجز
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.max_trees || ''}
                        onChange={(e) => setFormData({ ...formData, max_trees: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none"
                        placeholder="اختياري"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        العائد المتوقع
                      </label>
                      <input
                        type="text"
                        value={formData.expected_return}
                        onChange={(e) => setFormData({ ...formData, expected_return: e.target.value })}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none"
                        placeholder="15-20%"
                      />
                    </div>
                  </div>

                  <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-purple-700" />
                      <h4 className="text-lg font-bold text-purple-900">عرض لمدة محدودة (اختياري)</h4>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer mb-4">
                      <input
                        type="checkbox"
                        checked={formData.limited_offer_enabled}
                        onChange={(e) => setFormData({ ...formData, limited_offer_enabled: e.target.checked })}
                        className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-purple-900">تفعيل عرض محدود</span>
                    </label>

                    {formData.limited_offer_enabled && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-purple-700 mb-2">
                            عنوان العرض
                          </label>
                          <input
                            type="text"
                            value={formData.limited_offer_title}
                            onChange={(e) => setFormData({ ...formData, limited_offer_title: e.target.value })}
                            className="w-full px-4 py-2.5 border-2 border-purple-300 rounded-lg focus:border-purple-500 focus:outline-none"
                            placeholder="خصم 20% لأول 50 مستثمر"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-purple-700 mb-2">
                              تاريخ البداية
                            </label>
                            <input
                              type="datetime-local"
                              value={formData.limited_offer_start}
                              onChange={(e) => setFormData({ ...formData, limited_offer_start: e.target.value })}
                              className="w-full px-4 py-2.5 border-2 border-purple-300 rounded-lg focus:border-purple-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-purple-700 mb-2">
                              تاريخ النهاية
                            </label>
                            <input
                              type="datetime-local"
                              value={formData.limited_offer_end}
                              onChange={(e) => setFormData({ ...formData, limited_offer_end: e.target.value })}
                              className="w-full px-4 py-2.5 border-2 border-purple-300 rounded-lg focus:border-purple-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <ImageIcon className="w-5 h-5 text-blue-700" />
                      <h4 className="text-lg font-bold text-blue-900">صور إضافية (اختياري)</h4>
                      <span className="text-sm text-blue-600">({formData.images.length}/6)</span>
                    </div>

                    <div className="mb-4">
                      <label className="block w-full">
                        <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer">
                          <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                          <div className="text-sm font-medium text-blue-700">اضغط لرفع الصور</div>
                          <div className="text-xs text-blue-600 mt-1">يمكنك رفع حتى 6 صور</div>
                        </div>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e.target.files)}
                          className="hidden"
                          disabled={uploadingImages || formData.images.length >= 6}
                        />
                      </label>
                    </div>

                    {uploadingImages && (
                      <div className="text-center text-blue-600 mb-4">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                        <span className="text-sm">جاري رفع الصور...</span>
                      </div>
                    )}

                    {formData.images.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {formData.images.map((imageUrl, index) => (
                          <div
                            key={index}
                            className="relative rounded-lg overflow-hidden border-2 border-gray-300"
                          >
                            <img
                              src={imageUrl}
                              alt={`صورة ${index + 1}`}
                              className="w-full h-32 object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(imageUrl)}
                              className="absolute top-2 left-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-5 h-5 text-amber-600 rounded focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="text-sm font-medium text-gray-700">الفرصة نشطة ومتاحة للمستثمرين</span>
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors font-medium"
                    >
                      <Save className="w-5 h-5" />
                      {editingOpportunity ? 'حفظ التعديلات' : 'إضافة الفرصة'}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors font-medium"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : filteredFarms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <TrendingUp className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">لا توجد مزارع</h3>
              <p className="text-gray-600">يجب إضافة مزارع أولاً من "إدارة المزارع"</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredFarms.map(farm => {
                const farmOpportunities = opportunities[farm.id] || [];

                return (
                  <div
                    key={farm.id}
                    className={`rounded-xl border-2 overflow-hidden ${getCapacityColor(farm.capacity_status)}`}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">{farm.name}</h3>
                            {!farm.is_active && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                                <XCircle className="w-3 h-3" />
                                متوقفة
                              </span>
                            )}
                          </div>

                          {(farm.region_name || farm.city_name) && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                              <MapPin className="w-4 h-4" />
                              <span>{[farm.city_name, farm.region_name].filter(Boolean).join(' - ')}</span>
                            </div>
                          )}

                          {farm.tree_types.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-4">
                              {farm.tree_types.map(type => (
                                <span
                                  key={type}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white/70 rounded-full"
                                >
                                  <TreePine className="w-3 h-3" />
                                  {type}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="bg-white/50 rounded-lg p-4 mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <BarChart3 className="w-5 h-5" />
                                <span className="font-bold">الطاقة الاستيعابية</span>
                              </div>
                              <span className="text-sm font-medium">
                                {farm.used_capacity} / {farm.max_investable_trees}
                              </span>
                            </div>

                            <div className="w-full bg-white rounded-full h-3 mb-2">
                              <div
                                className={`h-3 rounded-full transition-all ${getCapacityBarColor(farm.occupancy_percentage)}`}
                                style={{ width: `${Math.min(farm.occupancy_percentage, 100)}%` }}
                              />
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <div className="text-gray-600">المستخدم</div>
                                <div className="font-bold">{farm.used_capacity}</div>
                              </div>
                              <div>
                                <div className="text-gray-600">المتاح</div>
                                <div className="font-bold">{farm.available_investable_capacity}</div>
                              </div>
                              <div>
                                <div className="text-gray-600">النسبة</div>
                                <div className="font-bold">{farm.occupancy_percentage.toFixed(1)}%</div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            {farm.capacity_status === 'almost_full' || farm.capacity_status === 'full' ? (
                              <AlertTriangle className="w-4 h-4" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            <span className="font-medium">{getCapacityMessage(farm)}</span>
                          </div>
                        </div>

                        {farm.main_image && (
                          <div className="w-32 h-32 rounded-lg overflow-hidden ml-4">
                            <img
                              src={farm.main_image}
                              alt={farm.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>

                      <div className="border-t-2 border-white/30 pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold flex items-center gap-2">
                            <Tag className="w-4 h-4" />
                            الفرص المرتبطة ({farmOpportunities.length})
                          </h4>
                          <button
                            onClick={() => openFormForFarm(farm.id)}
                            disabled={!farm.is_active || farm.capacity_status === 'full'}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex items-center gap-2 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-4 h-4" />
                            إضافة فرصة جديدة
                          </button>
                        </div>

                        {farmOpportunities.length === 0 ? (
                          <div className="text-center py-8 text-gray-600 bg-white/30 rounded-lg">
                            لا توجد فرص مرتبطة بهذه المزرعة بعد
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {farmOpportunities.map(opportunity => (
                              <div
                                key={opportunity.id}
                                className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border-2 border-white/50"
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <h5 className="font-bold text-gray-900 mb-1 line-clamp-1">{opportunity.title}</h5>
                                    <div className="flex items-center gap-2">
                                      {opportunity.is_active ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                          <CheckCircle className="w-3 h-3" />
                                          نشطة
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                                          <XCircle className="w-3 h-3" />
                                          معطلة
                                        </span>
                                      )}
                                      {opportunity.limited_offer_enabled && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                                          <Sparkles className="w-3 h-3" />
                                          عرض محدود
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-2 mb-3 text-sm">
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <TreePine className="w-4 h-4" />
                                    <span>{opportunity.number_of_trees} شجرة</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <DollarSign className="w-4 h-4" />
                                    <span>{opportunity.price_per_tree} ريال/شجرة/سنة</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <Calendar className="w-4 h-4" />
                                    <span>{opportunity.duration_months} شهر</span>
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEdit(opportunity)}
                                    className="flex-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center gap-1 transition-colors text-sm font-medium"
                                  >
                                    <Edit className="w-4 h-4" />
                                    تعديل
                                  </button>
                                  <button
                                    onClick={() => toggleStatus(opportunity)}
                                    className={`flex-1 px-3 py-2 rounded-lg flex items-center justify-center gap-1 transition-colors text-sm font-medium ${
                                      opportunity.is_active
                                        ? 'bg-orange-50 hover:bg-orange-100 text-orange-700'
                                        : 'bg-green-50 hover:bg-green-100 text-green-700'
                                    }`}
                                  >
                                    {opportunity.is_active ? (
                                      <>
                                        <XCircle className="w-4 h-4" />
                                        إيقاف
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="w-4 h-4" />
                                        تفعيل
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleDelete(opportunity.id)}
                                    className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              عرض {filteredFarms.length} مزرعة - {stats.totalOpportunities} فرصة
            </div>
            <div>
              آخر تحديث: الآن
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
