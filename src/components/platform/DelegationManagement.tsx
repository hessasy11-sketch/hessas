import { useState } from 'react';
import { useDelegations } from '../../hooks/useDelegations';
import { useFarmClusters } from '../../hooks/useFarmClusters';
import {
  Shield,
  Plus,
  X,
  Users,
  Layers,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function DelegationManagement() {
  const { delegations, loading, createDelegation, revokeDelegation } = useDelegations();
  const { clusters } = useFarmClusters();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    delegate_id: '',
    permission_type: 'approve_expenses',
    scope_type: 'cluster',
    scope_id: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const delegatorId = 'current-gm-id';

    const id = await createDelegation({
      delegator_id: delegatorId,
      delegate_id: formData.delegate_id,
      permission_type: formData.permission_type,
      scope_type: formData.scope_type,
      scope_id: formData.scope_id || undefined,
      notes: formData.notes
    });

    if (id) {
      setShowCreateModal(false);
      setFormData({
        delegate_id: '',
        permission_type: 'approve_expenses',
        scope_type: 'cluster',
        scope_id: '',
        notes: ''
      });
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('هل أنت متأكد من إلغاء هذا التفويض؟')) return;
    await revokeDelegation(id);
  };

  const getPermissionLabel = (type: string) => {
    switch (type) {
      case 'approve_expenses': return 'اعتماد المصروفات';
      case 'approve_decisions': return 'اعتماد القرارات';
      case 'view_reports': return 'عرض التقارير';
      case 'manage_teams': return 'إدارة الفرق';
      case 'assign_tasks': return 'تعيين المهام';
      default: return type;
    }
  };

  const getScopeLabel = (type: string) => {
    switch (type) {
      case 'cluster': return 'مجموعة مزارع';
      case 'farm': return 'مزرعة';
      case 'region': return 'منطقة';
      case 'all': return 'الكل';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
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
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">التفويض حسب النطاق</h2>
            <p className="text-sm text-gray-600">تفويض الصلاحيات حسب المجموعات</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">تفويض جديد</span>
        </button>
      </div>

      {/* Note */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-blue-900 mb-1">مجرد نطاق صلاحية</h4>
            <p className="text-sm text-blue-700 leading-relaxed">
              مشرف القصيم يعتمد مصروفات مزارعه فقط - لا يرى غيرها. بدون Automation، بدون Acting Mode.
            </p>
          </div>
        </div>
      </div>

      {/* Delegations Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-900">المفوض إليه</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-900">الصلاحية</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-900">النطاق</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-900">الحدود</th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">الحالة</th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {delegations.map((delegation) => (
                <tr key={delegation.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{delegation.delegate_name}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">
                      {getPermissionLabel(delegation.permission_type)}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {getScopeLabel(delegation.scope_type)}
                        </p>
                        {delegation.scope_name !== 'الكل' && (
                          <p className="text-xs text-gray-500">{delegation.scope_name}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    {delegation.limits && Object.keys(delegation.limits).length > 0 ? (
                      <div className="text-xs text-gray-600">
                        {delegation.limits.max_amount && (
                          <div>حد أقصى: {delegation.limits.max_amount.toLocaleString()} ر.س</div>
                        )}
                        {delegation.limits.max_per_day && (
                          <div>يومياً: {delegation.limits.max_per_day}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">بدون حدود</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-bold">
                      <CheckCircle className="w-3 h-3" />
                      نشط
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => handleRevoke(delegation.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="إلغاء"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {delegations.length === 0 && (
          <div className="p-8 text-center">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">لا توجد تفويضات</h3>
            <p className="text-sm text-gray-600">قم بإنشاء تفويض جديد للبدء</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">تفويض جديد</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الصلاحية *
                </label>
                <select
                  value={formData.permission_type}
                  onChange={(e) => setFormData({ ...formData, permission_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="approve_expenses">اعتماد المصروفات</option>
                  <option value="approve_decisions">اعتماد القرارات</option>
                  <option value="view_reports">عرض التقارير</option>
                  <option value="manage_teams">إدارة الفرق</option>
                  <option value="assign_tasks">تعيين المهام</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نوع النطاق *
                </label>
                <select
                  value={formData.scope_type}
                  onChange={(e) => setFormData({ ...formData, scope_type: e.target.value, scope_id: '' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="cluster">مجموعة مزارع</option>
                  <option value="farm">مزرعة</option>
                  <option value="region">منطقة</option>
                  <option value="all">الكل</option>
                </select>
              </div>

              {formData.scope_type === 'cluster' && clusters.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المجموعة *
                  </label>
                  <select
                    value={formData.scope_id}
                    onChange={(e) => setFormData({ ...formData, scope_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">اختر مجموعة</option>
                    {clusters.map((cluster) => (
                      <option key={cluster.id} value={cluster.id}>
                        {cluster.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملاحظات
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="ملاحظات إضافية عن التفويض"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 transition-all"
                >
                  إنشاء
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
