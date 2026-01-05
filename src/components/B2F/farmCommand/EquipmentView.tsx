import React, { useState, useEffect } from 'react';
import { Plus, Wrench, AlertTriangle, XCircle, Trash2, Edit2, Check, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Equipment {
  id: string;
  farm_id: string;
  name: string;
  status: 'working' | 'maintenance' | 'stopped';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface EquipmentViewProps {
  farmId: string;
}

interface EquipmentSummary {
  total: number;
  working: number;
  maintenance: number;
  stopped: number;
}

const EquipmentView: React.FC<EquipmentViewProps> = ({ farmId }) => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [summary, setSummary] = useState<EquipmentSummary>({ total: 0, working: 0, maintenance: 0, stopped: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    status: 'working' as 'working' | 'maintenance' | 'stopped',
    notes: ''
  });

  useEffect(() => {
    loadEquipment();
    loadSummary();
  }, [farmId]);

  const loadEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from('farm_equipment')
        .select('*')
        .eq('farm_id', farmId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEquipment(data || []);
    } catch (error) {
      console.error('Error loading equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const { data, error } = await supabase.rpc('get_farm_equipment_summary', {
        p_farm_id: farmId
      });

      if (error) throw error;
      if (data) setSummary(data);
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        const { error } = await supabase
          .from('farm_equipment')
          .update({
            name: formData.name,
            status: formData.status,
            notes: formData.notes || null
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('farm_equipment')
          .insert({
            farm_id: farmId,
            name: formData.name,
            status: formData.status,
            notes: formData.notes || null
          });

        if (error) throw error;
      }

      setFormData({ name: '', status: 'working', notes: '' });
      setShowAddModal(false);
      setEditingId(null);
      loadEquipment();
      loadSummary();
    } catch (error) {
      console.error('Error saving equipment:', error);
      alert('حدث خطأ في حفظ المعدة');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المعدة؟')) return;

    try {
      const { error } = await supabase
        .from('farm_equipment')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadEquipment();
      loadSummary();
    } catch (error) {
      console.error('Error deleting equipment:', error);
      alert('حدث خطأ في حذف المعدة');
    }
  };

  const startEdit = (item: Equipment) => {
    setFormData({
      name: item.name,
      status: item.status,
      notes: item.notes || ''
    });
    setEditingId(item.id);
    setShowAddModal(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'working': return <Wrench className="w-5 h-5 text-green-600" />;
      case 'maintenance': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'stopped': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      working: { bg: 'bg-green-100', text: 'text-green-800', label: 'تعمل' },
      maintenance: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'صيانة' },
      stopped: { bg: 'bg-red-100', text: 'text-red-800', label: 'متوقفة' }
    };
    const config = configs[status as keyof typeof configs] || configs.working;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">إجمالي المعدات</div>
          <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <div className="text-sm text-green-700 mb-1">تعمل</div>
          <div className="text-2xl font-bold text-green-900">{summary.working}</div>
        </div>
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
          <div className="text-sm text-yellow-700 mb-1">صيانة</div>
          <div className="text-2xl font-bold text-yellow-900">{summary.maintenance}</div>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <div className="text-sm text-red-700 mb-1">متوقفة</div>
          <div className="text-2xl font-bold text-red-900">{summary.stopped}</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">المعدات</h3>
        <button
          onClick={() => {
            setFormData({ name: '', status: 'working', notes: '' });
            setEditingId(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          إضافة معدة
        </button>
      </div>

      {equipment.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">لا توجد معدات مسجلة</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 text-blue-600 hover:text-blue-700 font-semibold"
          >
            إضافة أول معدة
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map((item) => (
            <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getStatusIcon(item.status)}
                  <div>
                    <h4 className="font-bold text-gray-900">{item.name}</h4>
                    <div className="mt-1">{getStatusBadge(item.status)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(item)}
                    className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {item.notes && (
                <p className="text-sm text-gray-600 mt-2">{item.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingId ? 'تعديل معدة' : 'إضافة معدة جديدة'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  اسم المعدة *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="مثال: جرار زراعي"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  الحالة *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="working">تعمل</option>
                  <option value="maintenance">صيانة</option>
                  <option value="stopped">متوقفة</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ملاحظات
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="أي ملاحظات إضافية..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  <Check className="w-4 h-4" />
                  {editingId ? 'حفظ التعديلات' : 'إضافة'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingId(null);
                    setFormData({ name: '', status: 'working', notes: '' });
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                >
                  <X className="w-4 h-4" />
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentView;
