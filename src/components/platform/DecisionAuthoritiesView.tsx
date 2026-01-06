import { useState } from 'react';
import { useDecisionAuthorities } from '../../hooks/useDecisionAuthorities';
import { Shield, Plus, Trash2, AlertCircle, CheckCircle, Lock, Unlock } from 'lucide-react';

interface AddAuthorityModalProps {
  decisionType: string;
  onClose: () => void;
  onAdd: (role: string, conditions: Record<string, any>, descAr: string, descEn: string) => void;
}

function AddAuthorityModal({ decisionType, onClose, onAdd }: AddAuthorityModalProps) {
  const [role, setRole] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [descAr, setDescAr] = useState('');
  const [descEn, setDescEn] = useState('');

  const roles = [
    { value: 'super_admin', label: 'المدير العام (GM)', color: 'text-red-600' },
    { value: 'admin', label: 'مسؤول النظام', color: 'text-orange-600' },
    { value: 'b2f_manager', label: 'مدير B2F', color: 'text-blue-600' },
    { value: 'b2f_assistant', label: 'مساعد B2F', color: 'text-green-600' },
    { value: 'b2b_manager', label: 'مدير B2B', color: 'text-purple-600' },
    { value: 'finance_manager', label: 'مدير المالية', color: 'text-yellow-600' }
  ];

  const handleSubmit = () => {
    if (!role) return;

    const conditions: Record<string, any> = {};
    if (maxAmount && decisionType === 'approve_expense') {
      conditions.max_amount = parseFloat(maxAmount);
    }

    onAdd(role, conditions, descAr, descEn);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <Plus className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">إضافة صلاحية جديدة</h2>
            <p className="text-gray-500">نوع القرار: {decisionType}</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* اختيار الدور */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الدور المسموح له
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">اختر الدور...</option>
              {roles.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* شروط إضافية */}
          {decisionType === 'approve_expense' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الحد الأقصى للمبلغ (اختياري)
              </label>
              <input
                type="number"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="مثال: 5000"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                اترك فارغاً للسماح بأي مبلغ
              </p>
            </div>
          )}

          {/* الوصف بالعربية */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الوصف بالعربية
            </label>
            <input
              type="text"
              value={descAr}
              onChange={(e) => setDescAr(e.target.value)}
              placeholder="مثال: يمكنه اعتماد المصروفات حتى 5000 ر.س"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* الوصف بالإنجليزية */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الوصف بالإنجليزية
            </label>
            <input
              type="text"
              value={descEn}
              onChange={(e) => setDescEn(e.target.value)}
              placeholder="Example: Can approve expenses up to 5000 SAR"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={handleSubmit}
            disabled={!role}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            إضافة الصلاحية
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DecisionAuthoritiesView() {
  const { decisionTypes, loading, error, addAuthority, removeAuthority, refresh } = useDecisionAuthorities();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDecisionType, setSelectedDecisionType] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddAuthority = async (role: string, conditions: Record<string, any>, descAr: string, descEn: string) => {
    const result = await addAuthority(selectedDecisionType, role, conditions, descAr, descEn);
    if (result.success) {
      showNotification('success', 'تمت إضافة الصلاحية بنجاح');
    } else {
      showNotification('error', 'فشل في إضافة الصلاحية');
    }
  };

  const handleRemoveAuthority = async (authorityId: string) => {
    if (!confirm('هل أنت متأكد من إزالة هذه الصلاحية؟')) return;

    const result = await removeAuthority(authorityId);
    if (result.success) {
      showNotification('success', 'تمت إزالة الصلاحية بنجاح');
    } else {
      showNotification('error', 'فشل في إزالة الصلاحية');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: 'bg-red-100 text-red-700 border-red-200',
      admin: 'bg-orange-100 text-orange-700 border-orange-200',
      b2f_manager: 'bg-blue-100 text-blue-700 border-blue-200',
      b2f_assistant: 'bg-green-100 text-green-700 border-green-200',
      b2b_manager: 'bg-purple-100 text-purple-700 border-purple-200',
      finance_manager: 'bg-yellow-100 text-yellow-700 border-yellow-200'
    };
    return colors[role] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: 'المدير العام',
      admin: 'مسؤول',
      b2f_manager: 'مدير B2F',
      b2f_assistant: 'مساعد B2F',
      b2b_manager: 'مدير B2B',
      finance_manager: 'مدير المالية'
    };
    return labels[role] || role;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <div>
            <h3 className="text-red-900 font-semibold">خطأ في تحميل البيانات</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">نظام صلاحيات القرارات</h1>
            <p className="text-blue-100">تحديد من يملك حق اعتماد كل نوع من القرارات</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-5 h-5" />
              <span className="text-sm text-blue-100">أنواع القرارات</span>
            </div>
            <p className="text-3xl font-bold">{decisionTypes.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Unlock className="w-5 h-5" />
              <span className="text-sm text-blue-100">إجمالي الصلاحيات</span>
            </div>
            <p className="text-3xl font-bold">
              {decisionTypes.reduce((sum, dt) => sum + (dt.authorities?.length || 0), 0)}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm text-blue-100">نشط</span>
            </div>
            <p className="text-3xl font-bold">
              {decisionTypes.reduce((sum, dt) => sum + (dt.authorities?.length || 0), 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`${
          notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'
        } border rounded-xl p-4 flex items-center gap-3`}>
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          <p className="font-medium">{notification.message}</p>
        </div>
      )}

      {/* Decision Types List */}
      <div className="space-y-4">
        {decisionTypes.map((decisionType) => (
          <div key={decisionType.decision_type} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {decisionType.decision_name_ar}
                  </h3>
                  <p className="text-sm text-gray-500">{decisionType.decision_name_en}</p>
                  <p className="text-xs text-gray-400 mt-1 font-mono">{decisionType.decision_type}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedDecisionType(decisionType.decision_type);
                    setShowAddModal(true);
                  }}
                  className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  إضافة صلاحية
                </button>
              </div>
            </div>

            {/* Authorities List */}
            <div className="p-6">
              {decisionType.authorities && decisionType.authorities.length > 0 ? (
                <div className="space-y-3">
                  {decisionType.authorities.map((authority: any) => (
                    <div
                      key={authority.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`px-3 py-1 rounded-lg border font-medium text-sm ${getRoleBadgeColor(authority.allowed_role)}`}>
                          {getRoleLabel(authority.allowed_role)}
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-900 font-medium">{authority.description_ar}</p>
                          <p className="text-sm text-gray-500">{authority.description_en}</p>
                          {authority.conditions && Object.keys(authority.conditions).length > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-gray-500">شروط:</span>
                              {authority.conditions.max_amount && (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg">
                                  حتى {authority.conditions.max_amount.toLocaleString()} ر.س
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveAuthority(authority.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="حذف الصلاحية"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Lock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">لا توجد صلاحيات محددة</p>
                  <p className="text-sm">انقر "إضافة صلاحية" لتحديد من يمكنه اعتماد هذا النوع من القرارات</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Authority Modal */}
      {showAddModal && (
        <AddAuthorityModal
          decisionType={selectedDecisionType}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddAuthority}
        />
      )}
    </div>
  );
}
