import { useState, useEffect } from 'react';
import { Trees, Plus, Loader2, Leaf, Edit2, Trash2, Save, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface FarmContent {
  id: string;
  content_type: string;
  name_ar: string;
  name_en?: string;
  quantity: number;
  unit: string;
  section_code?: string;
  notes?: string;
}

export default function FarmContentsView({ farmId }: { farmId: string }) {
  const [contents, setContents] = useState<FarmContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'trees' | 'crops'>('all');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<FarmContent>>({
    content_type: 'tree',
    name_ar: '',
    quantity: 0,
    unit: 'شجرة'
  });

  useEffect(() => {
    loadContents();
  }, [farmId, filter]);

  const loadContents = async () => {
    try {
      let query = supabase
        .from('fc_farm_contents')
        .select('*')
        .eq('farm_id', farmId)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('content_type', filter === 'trees' ? 'tree' : 'crop');
      }

      const { data, error } = await query;

      if (error) throw error;
      setContents(data || []);
    } catch (error) {
      console.error('Error loading contents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.name_ar || !formData.content_type) {
        alert('يرجى إدخال النوع والاسم');
        return;
      }

      if (editingId) {
        const { error } = await supabase
          .from('fc_farm_contents')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('fc_farm_contents')
          .insert({
            ...formData,
            farm_id: farmId
          });

        if (error) throw error;
      }

      setIsAddingNew(false);
      setEditingId(null);
      setFormData({
        content_type: 'tree',
        name_ar: '',
        quantity: 0,
        unit: 'شجرة'
      });
      loadContents();
    } catch (error: any) {
      alert('حدث خطأ: ' + error.message);
    }
  };

  const handleEdit = (content: FarmContent) => {
    setEditingId(content.id);
    setFormData(content);
    setIsAddingNew(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المحتوى؟')) return;

    try {
      const { error } = await supabase
        .from('fc_farm_contents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadContents();
    } catch (error: any) {
      alert('حدث خطأ: ' + error.message);
    }
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setFormData({
      content_type: 'tree',
      name_ar: '',
      quantity: 0,
      unit: 'شجرة'
    });
  };

  const getTotalTrees = () => {
    return contents
      .filter(c => c.content_type === 'tree')
      .reduce((sum, c) => sum + (c.quantity || 0), 0);
  };

  const getTotalCrops = () => {
    return contents
      .filter(c => c.content_type === 'crop')
      .reduce((sum, c) => sum + (c.quantity || 0), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">محتويات المزرعة</h2>
        <p className="text-sm text-gray-600 mt-1">
          الأشجار والمحاصيل في المزرعة
        </p>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Trees className="w-6 h-6 opacity-80" />
            <span className="text-3xl font-bold">{getTotalTrees()}</span>
          </div>
          <p className="text-sm opacity-90">إجمالي الأشجار</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Leaf className="w-6 h-6 opacity-80" />
            <span className="text-3xl font-bold">{getTotalCrops()}</span>
          </div>
          <p className="text-sm opacity-90">إجمالي المحاصيل</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Plus className="w-6 h-6 opacity-80" />
            <span className="text-3xl font-bold">{contents.length}</span>
          </div>
          <p className="text-sm opacity-90">إجمالي الأنواع</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['all', 'trees', 'crops'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f === 'all' && 'الكل'}
              {f === 'trees' && 'الأشجار'}
              {f === 'crops' && 'المحاصيل'}
            </button>
          ))}
        </div>

        {!isAddingNew && (
          <button
            onClick={() => setIsAddingNew(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة محتوى
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {isAddingNew && (
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {editingId ? 'تعديل المحتوى' : 'إضافة محتوى جديد'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                النوع
              </label>
              <select
                value={formData.content_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    content_type: e.target.value,
                    unit:
                      e.target.value === 'tree'
                        ? 'شجرة'
                        : e.target.value === 'crop'
                        ? 'طن'
                        : 'وحدة'
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="tree">أشجار</option>
                <option value="crop">محاصيل</option>
                <option value="other">أخرى</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الاسم بالعربية
              </label>
              <input
                type="text"
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                placeholder="مثال: نخيل بلح"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الاسم بالإنجليزية (اختياري)
              </label>
              <input
                type="text"
                value={formData.name_en || ''}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                placeholder="Example: Date Palm"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الكمية
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الوحدة
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="مثال: شجرة، طن، كجم"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                القطاع/القسم (اختياري)
              </label>
              <input
                type="text"
                value={formData.section_code || ''}
                onChange={(e) => setFormData({ ...formData, section_code: e.target.value })}
                placeholder="مثال: A1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ملاحظات (اختياري)
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="أي ملاحظات إضافية..."
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Save className="w-4 h-4" />
              حفظ
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Contents List */}
      {contents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Trees className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">لا توجد محتويات</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contents.map((content) => (
            <div
              key={content.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                {content.content_type === 'tree' ? (
                  <Trees className="w-6 h-6 text-green-600" />
                ) : (
                  <Leaf className="w-6 h-6 text-amber-600" />
                )}
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                  {content.content_type === 'tree' ? 'شجرة' : 'محصول'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <h4 className="text-lg font-bold text-gray-900">{content.name_ar}</h4>
                {content.name_en && (
                  <p className="text-sm text-gray-500">{content.name_en}</p>
                )}
                <div className="text-2xl font-bold text-green-600">
                  {content.quantity} {content.unit}
                </div>
                {content.section_code && (
                  <div className="text-sm text-gray-600">
                    <span>القطاع: </span>
                    <span className="font-medium">{content.section_code}</span>
                  </div>
                )}
                {content.notes && (
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">{content.notes}</p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                <button
                  onClick={() => handleEdit(content)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  تعديل
                </button>
                <button
                  onClick={() => handleDelete(content.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
