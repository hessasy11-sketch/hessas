import { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Edit,
  Trash2,
  Search,
  RefreshCw,
  MapPin,
  Phone,
  User,
  TreePine,
  CheckCircle,
  XCircle,
  Save,
  Building2,
  Upload,
  Image as ImageIcon,
  Star
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Farm {
  id: string;
  name: string;
  description: string | null;
  region_id: string | null;
  city_id: string | null;
  tree_types: string[];
  total_capacity: number;
  available_capacity: number;
  is_active: boolean;
  owner_name: string | null;
  owner_phone: string | null;
  address: string | null;
  location_coordinates: string | null;
  images: string[];
  main_image: string | null;
  created_at: string;
  updated_at: string;
  region?: { name_ar: string } | null;
  city?: { name_ar: string } | null;
}

interface Region {
  id: string;
  name_ar: string;
}

interface City {
  id: string;
  name_ar: string;
  region_id: string;
}

interface FarmsManagementProps {
  onClose: () => void;
}

export function FarmsManagement({ onClose }: FarmsManagementProps) {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [filteredFarms, setFilteredFarms] = useState<Farm[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    region_id: '',
    city_id: '',
    tree_types: [] as string[],
    total_capacity: 0,
    available_capacity: 0,
    is_active: true,
    owner_name: '',
    owner_phone: '',
    address: '',
    images: [] as string[],
    main_image: ''
  });

  const treeTypeOptions = [
    'نخيل',
    'زيتون',
    'رمان',
    'تين',
    'عنب',
    'ليمون',
    'برتقال',
    'مانجو',
    'جوافة',
    'تفاح'
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, farms]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select(`
          *,
          region:regions(name_ar),
          city:cities(name_ar)
        `)
        .order('created_at', { ascending: false });

      if (farmsError) throw farmsError;
      setFarms(farmsData || []);

      const { data: regionsData, error: regionsError } = await supabase
        .from('regions')
        .select('id, name_ar')
        .order('name_ar');

      if (regionsError) throw regionsError;
      setRegions(regionsData || []);

      const { data: citiesData, error: citiesError } = await supabase
        .from('cities')
        .select('id, name_ar, region_id')
        .order('name_ar');

      if (citiesError) throw citiesError;
      setCities(citiesData || []);

    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...farms];

    if (searchQuery.trim()) {
      filtered = filtered.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.owner_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredFarms(filtered);
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

        const { error: uploadError, data } = await supabase.storage
          .from('farm-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('farm-images')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      const newImages = [...formData.images, ...uploadedUrls];
      setFormData(prev => ({
        ...prev,
        images: newImages,
        main_image: prev.main_image || uploadedUrls[0]
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
      images: prev.images.filter(img => img !== imageUrl),
      main_image: prev.main_image === imageUrl ? (prev.images[0] || '') : prev.main_image
    }));
  };

  const handleSetMainImage = (imageUrl: string) => {
    setFormData(prev => ({
      ...prev,
      main_image: imageUrl
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const dataToSave = {
        name: formData.name,
        description: formData.description || null,
        region_id: formData.region_id || null,
        city_id: formData.city_id || null,
        tree_types: formData.tree_types,
        total_capacity: formData.total_capacity,
        available_capacity: editingFarm ? formData.available_capacity : formData.total_capacity,
        is_active: formData.is_active,
        owner_name: formData.owner_name || null,
        owner_phone: formData.owner_phone || null,
        address: formData.address || null,
        images: formData.images,
        main_image: formData.main_image || null
      };

      if (editingFarm) {
        const { error } = await supabase
          .from('farms')
          .update({
            ...dataToSave,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingFarm.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('farms')
          .insert([dataToSave]);

        if (error) throw error;
      }

      resetForm();
      loadData();
    } catch (err) {
      console.error('Error saving farm:', err);
      alert('حدث خطأ أثناء حفظ المزرعة');
    }
  };

  const handleEdit = (farm: Farm) => {
    setEditingFarm(farm);
    setFormData({
      name: farm.name,
      description: farm.description || '',
      region_id: farm.region_id || '',
      city_id: farm.city_id || '',
      tree_types: farm.tree_types || [],
      total_capacity: farm.total_capacity,
      available_capacity: farm.available_capacity,
      is_active: farm.is_active,
      owner_name: farm.owner_name || '',
      owner_phone: farm.owner_phone || '',
      address: farm.address || '',
      images: farm.images || [],
      main_image: farm.main_image || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (farmId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المزرعة؟\n\nتحذير: سيتم حذف جميع العروض والحجوزات والعقود والإيصالات والشهادات المرتبطة بهذه المزرعة بشكل نهائي!')) return;

    try {
      const { data: opportunities } = await supabase
        .from('b2f_opportunities')
        .select('id')
        .eq('farm_id', farmId);

      if (opportunities && opportunities.length > 0) {
        const opportunityIds = opportunities.map(o => o.id);

        const { data: reservations } = await supabase
          .from('investment_reservations')
          .select('id')
          .in('opportunity_id', opportunityIds);

        if (reservations && reservations.length > 0) {
          const reservationIds = reservations.map(r => r.id);

          await supabase
            .from('b2f_certificates')
            .delete()
            .in('reservation_id', reservationIds);

          const { data: contracts } = await supabase
            .from('b2f_contracts')
            .select('id')
            .in('reservation_id', reservationIds);

          if (contracts && contracts.length > 0) {
            const contractIds = contracts.map(c => c.id);

            await supabase
              .from('b2f_payment_receipts')
              .delete()
              .in('contract_id', contractIds);
          }

          await supabase
            .from('b2f_contracts')
            .delete()
            .in('reservation_id', reservationIds);
        }

        await supabase
          .from('investment_reservations')
          .delete()
          .in('opportunity_id', opportunityIds);

        await supabase
          .from('b2f_opportunities')
          .delete()
          .eq('farm_id', farmId);
      }

      const { error } = await supabase
        .from('farms')
        .delete()
        .eq('id', farmId);

      if (error) throw error;

      alert('تم حذف المزرعة وجميع البيانات المرتبطة بها بنجاح');
      loadData();
    } catch (err) {
      console.error('Error deleting farm:', err);
      alert('حدث خطأ أثناء حذف المزرعة: ' + (err as Error).message);
    }
  };

  const toggleStatus = async (farm: Farm) => {
    try {
      const { error } = await supabase
        .from('farms')
        .update({ is_active: !farm.is_active })
        .eq('id', farm.id);

      if (error) throw error;
      loadData();
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      region_id: '',
      city_id: '',
      tree_types: [],
      total_capacity: 0,
      available_capacity: 0,
      is_active: true,
      owner_name: '',
      owner_phone: '',
      address: '',
      images: [],
      main_image: ''
    });
    setEditingFarm(null);
    setShowForm(false);
  };

  const toggleTreeType = (treeType: string) => {
    setFormData(prev => ({
      ...prev,
      tree_types: prev.tree_types.includes(treeType)
        ? prev.tree_types.filter(t => t !== treeType)
        : [...prev.tree_types, treeType]
    }));
  };

  const getAvailableCities = () => {
    if (!formData.region_id) return [];
    return cities.filter(c => c.region_id === formData.region_id);
  };

  const stats = {
    total: farms.length,
    active: farms.filter(f => f.is_active).length,
    inactive: farms.filter(f => !f.is_active).length,
    totalCapacity: farms.reduce((sum, f) => sum + f.total_capacity, 0),
    availableCapacity: farms.reduce((sum, f) => sum + f.available_capacity, 0)
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col">

        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">إدارة المزارع</h2>
              <p className="text-green-100 text-sm mt-1">
                إدارة البيانات الأساسية للمزارع
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
              <div className="text-sm text-gray-600 mb-1">إجمالي المزارع</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
              <div className="text-sm text-green-700 mb-1">مزارع نشطة</div>
              <div className="text-2xl font-bold text-green-800">{stats.active}</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
              <div className="text-sm text-red-700 mb-1">مزارع متوقفة</div>
              <div className="text-2xl font-bold text-red-800">{stats.inactive}</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
              <div className="text-sm text-blue-700 mb-1">الطاقة الكلية</div>
              <div className="text-2xl font-bold text-blue-800">{stats.totalCapacity.toLocaleString('ar-SA')}</div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 border-2 border-emerald-200">
              <div className="text-sm text-emerald-700 mb-1">الطاقة المتاحة</div>
              <div className="text-2xl font-bold text-emerald-800">{stats.availableCapacity.toLocaleString('ar-SA')}</div>
            </div>
          </div>
        </div>

        <div className="px-8 py-4 bg-white border-b border-gray-200">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="بحث بالاسم أو اسم المالك..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
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

            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              إضافة مزرعة جديدة
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-8 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-green-600 animate-spin" />
            </div>
          ) : showForm ? (
            <div className="max-w-5xl mx-auto">
              <div className="bg-white rounded-xl border-2 border-gray-200 p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6">
                  {editingFarm ? 'تعديل المزرعة' : 'إضافة مزرعة جديدة'}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      اسم المزرعة *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                      placeholder="مثال: مزرعة الخير"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الوصف
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                      placeholder="وصف مختصر عن المزرعة..."
                    />
                  </div>

                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <ImageIcon className="w-5 h-5 text-blue-700" />
                      <h4 className="text-lg font-bold text-blue-900">صور المزرعة</h4>
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
                            className={`relative rounded-lg overflow-hidden border-2 ${
                              formData.main_image === imageUrl
                                ? 'border-yellow-500 ring-2 ring-yellow-300'
                                : 'border-gray-300'
                            }`}
                          >
                            <img
                              src={imageUrl}
                              alt={`صورة ${index + 1}`}
                              className="w-full h-32 object-cover"
                            />

                            {formData.main_image === imageUrl && (
                              <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                <Star className="w-3 h-3 fill-current" />
                                رئيسية
                              </div>
                            )}

                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 flex gap-1">
                              {formData.main_image !== imageUrl && (
                                <button
                                  type="button"
                                  onClick={() => handleSetMainImage(imageUrl)}
                                  className="flex-1 px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-xs font-medium"
                                  title="تعيين كصورة رئيسية"
                                >
                                  <Star className="w-3 h-3 mx-auto" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(imageUrl)}
                                className="flex-1 px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium"
                              >
                                حذف
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {formData.images.length === 0 && (
                      <div className="text-center text-gray-500 py-4">
                        لم يتم رفع أي صور بعد
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        المنطقة
                      </label>
                      <select
                        value={formData.region_id}
                        onChange={(e) => setFormData({ ...formData, region_id: e.target.value, city_id: '' })}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                      >
                        <option value="">اختر المنطقة</option>
                        {regions.map(region => (
                          <option key={region.id} value={region.id}>{region.name_ar}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        المدينة
                      </label>
                      <select
                        value={formData.city_id}
                        onChange={(e) => setFormData({ ...formData, city_id: e.target.value })}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                        disabled={!formData.region_id}
                      >
                        <option value="">اختر المدينة</option>
                        {getAvailableCities().map(city => (
                          <option key={city.id} value={city.id}>{city.name_ar}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      أنواع الأشجار المتاحة *
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {treeTypeOptions.map(treeType => (
                        <label
                          key={treeType}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                            formData.tree_types.includes(treeType)
                              ? 'bg-green-50 border-green-500 text-green-700'
                              : 'bg-white border-gray-300 hover:border-green-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.tree_types.includes(treeType)}
                            onChange={() => toggleTreeType(treeType)}
                            className="hidden"
                          />
                          <TreePine className="w-4 h-4" />
                          <span className="text-sm font-medium">{treeType}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الطاقة الاستيعابية الكلية *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={formData.total_capacity}
                        onChange={(e) => setFormData({ ...formData, total_capacity: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                        placeholder="عدد الأشجار"
                      />
                    </div>

                    {editingFarm && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          الطاقة المتاحة حالياً
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.available_capacity}
                          onChange={(e) => setFormData({ ...formData, available_capacity: parseInt(e.target.value) || 0 })}
                          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        اسم المالك
                      </label>
                      <input
                        type="text"
                        value={formData.owner_name}
                        onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        جوال المالك
                      </label>
                      <input
                        type="tel"
                        value={formData.owner_phone}
                        onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                        placeholder="05xxxxxxxx"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      العنوان التفصيلي
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                      />
                      <span className="text-sm font-medium text-gray-700">المزرعة نشطة ومتاحة</span>
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors font-medium"
                    >
                      <Save className="w-5 h-5" />
                      {editingFarm ? 'حفظ التعديلات' : 'إضافة المزرعة'}
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
              <Building2 className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">لا توجد مزارع</h3>
              <p className="text-gray-600 mb-4">ابدأ بإضافة مزرعة جديدة</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" />
                إضافة مزرعة
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFarms.map(farm => (
                <div
                  key={farm.id}
                  className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {farm.main_image && (
                    <div className="relative h-48">
                      <img
                        src={farm.main_image}
                        alt={farm.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{farm.name}</h3>
                        <div className="flex items-center gap-2">
                          {farm.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                              <CheckCircle className="w-3 h-3" />
                              نشطة
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                              <XCircle className="w-3 h-3" />
                              متوقفة
                            </span>
                          )}
                          {farm.images.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                              <ImageIcon className="w-3 h-3" />
                              {farm.images.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {farm.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{farm.description}</p>
                    )}

                    <div className="space-y-2 mb-4">
                      {(farm.region || farm.city) && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>{[farm.city?.name_ar, farm.region?.name_ar].filter(Boolean).join(' - ')}</span>
                        </div>
                      )}

                      {farm.owner_name && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="w-4 h-4" />
                          <span>{farm.owner_name}</span>
                        </div>
                      )}

                      {farm.owner_phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span dir="ltr">{farm.owner_phone}</span>
                        </div>
                      )}

                      {farm.tree_types.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {farm.tree_types.map(type => (
                            <span
                              key={type}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-700 rounded-full"
                            >
                              <TreePine className="w-3 h-3" />
                              {type}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">الطاقة المتاحة</span>
                        <span className="font-bold text-gray-900">
                          {farm.available_capacity.toLocaleString('ar-SA')} / {farm.total_capacity.toLocaleString('ar-SA')}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${(farm.available_capacity / farm.total_capacity) * 100}%`
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(farm)}
                        className="flex-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center gap-1 transition-colors text-sm font-medium"
                      >
                        <Edit className="w-4 h-4" />
                        تعديل
                      </button>
                      <button
                        onClick={() => toggleStatus(farm)}
                        className={`flex-1 px-3 py-2 rounded-lg flex items-center justify-center gap-1 transition-colors text-sm font-medium ${
                          farm.is_active
                            ? 'bg-orange-50 hover:bg-orange-100 text-orange-700'
                            : 'bg-green-50 hover:bg-green-100 text-green-700'
                        }`}
                      >
                        {farm.is_active ? (
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
                        onClick={() => handleDelete(farm.id)}
                        className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              عرض {filteredFarms.length} من {farms.length} مزرعة
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
