import { useState } from 'react';
import { useFarmClusters } from '../../hooks/useFarmClusters';
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  X
} from 'lucide-react';

export default function ClustersManagement() {
  const { clusters, loading, createCluster, updateCluster, deleteCluster, refresh } = useFarmClusters();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCluster, setEditingCluster] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    description: '',
    priority: 'normal'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingCluster) {
      const success = await updateCluster(editingCluster.id, formData);
      if (success) {
        setEditingCluster(null);
        setFormData({ name: '', name_en: '', description: '', priority: 'normal' });
      }
    } else {
      const id = await createCluster(formData);
      if (id) {
        setShowCreateModal(false);
        setFormData({ name: '', name_en: '', description: '', priority: 'normal' });
      }
    }

    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المجموعة؟')) return;

    const success = await deleteCluster(id);
    if (success) {
      refresh();
    }
  };

  const handleEdit = (cluster: any) => {
    setEditingCluster(cluster);
    setFormData({
      name: cluster.name || '',
      name_en: cluster.name_en || '',
      description: '',
      priority: cluster.priority || 'normal'
    });
    setShowCreateModal(true);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="mr-3 text-gray-600">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">إدارة مجموعات المزارع</h2>
            <p className="text-sm text-gray-600">تنظيم المزارع تحت قيادات إقليمية</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">إنشاء مجموعة جديدة</span>
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Layers className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">مجموعات المزارع</p>
              <p className="text-2xl font-bold text-gray-900">{clusters.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">إجمالي المزارع</p>
              <p className="text-2xl font-bold text-gray-900">
                {clusters.reduce((sum, c) => sum + c.farms_count, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">المزارع النشطة</p>
              <p className="text-2xl font-bold text-gray-900">
                {clusters.reduce((sum, c) => sum + c.active_farms, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">المزارع المتعثرة</p>
              <p className="text-2xl font-bold text-gray-900">
                {clusters.reduce((sum, c) => sum + c.struggling_farms, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Clusters Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-900">المجموعة</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-900">المشرف</th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">المزارع</th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">النشطة</th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">المتعثرة</th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">القرارات</th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">الأداء</th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clusters.map((cluster) => (
                <tr key={cluster.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{cluster.name}</p>
                      {cluster.region_name && (
                        <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-600">
                          <MapPin className="w-3 h-3" />
                          <span>{cluster.region_name}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    {cluster.supervisor_name ? (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{cluster.supervisor_name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">غير محدد</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-center">
                    <span className="text-lg font-bold text-gray-900">{cluster.farms_count}</span>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <span className="text-lg font-bold text-green-600">{cluster.active_farms}</span>
                  </td>

                  <td className="px-6 py-4 text-center">
                    {cluster.struggling_farms > 0 ? (
                      <span className="text-lg font-bold text-red-600">{cluster.struggling_farms}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-center">
                    {cluster.pending_decisions > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-sm font-bold">
                        <AlertCircle className="w-3 h-3" />
                        {cluster.pending_decisions}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-center">
                    <span className={`
                      inline-flex px-3 py-1 rounded-lg text-sm font-bold
                      ${cluster.avg_performance >= 40 ? 'bg-green-100 text-green-700' :
                        cluster.avg_performance >= 25 ? 'bg-yellow-100 text-yellow-700' :
                        cluster.avg_performance >= 10 ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'}
                    `}>
                      {cluster.avg_performance.toFixed(1)}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(cluster)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="تعديل"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cluster.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingCluster ? 'تعديل المجموعة' : 'إنشاء مجموعة جديدة'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingCluster(null);
                  setFormData({ name: '', name_en: '', description: '', priority: 'normal' });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم المجموعة *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                  placeholder="مثال: منطقة القصيم"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الاسم بالإنجليزية
                </label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Example: Qassim Region"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الوصف
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={3}
                  placeholder="وصف مختصر للمجموعة"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الأولوية
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="low">منخفض</option>
                  <option value="normal">عادي</option>
                  <option value="high">عالي</option>
                  <option value="critical">حرج</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transition-all"
                >
                  {editingCluster ? 'تحديث' : 'إنشاء'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingCluster(null);
                    setFormData({ name: '', name_en: '', description: '', priority: 'normal' });
                  }}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
