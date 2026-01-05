import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Shield,
  UserPlus,
  UserMinus,
  User,
  History,
  Loader2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ExecutiveAuthorityPanelProps {
  onBack: () => void;
}

interface Owner {
  type: string;
  type_ar: string;
  staff_id: string | null;
  name: string | null;
  assigned_at: string | null;
}

interface Staff {
  id: string;
  name_ar: string;
  role: string;
  department: string;
  is_active: boolean;
}

interface ExecutiveLog {
  id: string;
  executed_by: string;
  executor_name: string;
  action_type: string;
  action_title: string;
  target_name: string;
  executed_at: string;
  result: string;
}

export default function ExecutiveAuthorityPanel({ onBack }: ExecutiveAuthorityPanelProps) {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [logs, setLogs] = useState<ExecutiveLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOwnerType, setSelectedOwnerType] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPanelData();
  }, []);

  const loadPanelData = async () => {
    setLoading(true);
    try {
      const [ownersRes, staffRes, logsRes] = await Promise.all([
        supabase.rpc('get_executive_owners'),
        supabase.from('platform_staff').select('id, name_ar, role, department, is_active').eq('is_active', true),
        supabase.from('executive_actions_log').select('*').order('executed_at', { ascending: false }).limit(20)
      ]);

      if (ownersRes.data) {
        const ownersArray: Owner[] = [
          { type: 'b2f', type_ar: 'مساعد مدير B2F', ...ownersRes.data.b2f },
          { type: 'farm_command', type_ar: 'مدير المزارع الوطني', ...ownersRes.data.farm_command },
          { type: 'b2b', type_ar: 'مساعد مدير B2B', ...ownersRes.data.b2b },
          { type: 'finance', type_ar: 'المحاسب الرئيسي', ...ownersRes.data.finance },
          { type: 'marketing', type_ar: 'مدير التسويق', ...ownersRes.data.marketing }
        ];
        setOwners(ownersArray);
      }

      if (staffRes.data) setAllStaff(staffRes.data);
      if (logsRes.data) setLogs(logsRes.data);
    } catch (error) {
      console.error('Error loading panel data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignOwner = async () => {
    if (!selectedOwnerType || !selectedStaffId) {
      alert('الرجاء اختيار المنصب والموظف');
      return;
    }

    setProcessing(true);
    try {
      const gmStaffId = sessionStorage.getItem('staff_id');
      if (!gmStaffId) {
        alert('غير مصرح');
        return;
      }

      const { data, error } = await supabase.rpc('assign_executive_owner', {
        p_owner_type: selectedOwnerType,
        p_staff_id: selectedStaffId,
        p_assigned_by: gmStaffId
      });

      if (error) throw error;

      if (data && data.success) {
        alert('تم تعيين المسؤول بنجاح');
        setShowAssignModal(false);
        setSelectedOwnerType('');
        setSelectedStaffId('');
        loadPanelData();
      } else {
        alert('حدث خطأ: ' + (data?.error || 'خطأ غير معروف'));
      }
    } catch (error: any) {
      console.error('Error assigning owner:', error);
      alert('حدث خطأ: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getOwnerColor = (type: string) => {
    switch (type) {
      case 'b2f': return 'border-emerald-300 bg-emerald-50';
      case 'farm_command': return 'border-blue-300 bg-blue-50';
      case 'b2b': return 'border-blue-300 bg-blue-50';
      case 'finance': return 'border-amber-300 bg-amber-50';
      case 'marketing': return 'border-purple-300 bg-purple-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getActionTypeColor = (actionType: string) => {
    if (actionType.includes('assign')) return 'text-emerald-700';
    if (actionType.includes('revoke') || actionType.includes('suspend')) return 'text-red-700';
    if (actionType.includes('approve')) return 'text-blue-700';
    return 'text-gray-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>العودة</span>
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border-2 border-gray-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">لوحة الصلاحيات</h1>
                <p className="text-sm text-gray-600">Authority & Permissions Panel</p>
              </div>
            </div>
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 flex items-center gap-2 transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              <span>تعيين مسؤول</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <User className="w-6 h-6 text-gray-600" />
                <h2 className="text-xl font-bold text-gray-900">المسؤولين الحاليين</h2>
              </div>

              <div className="space-y-4">
                {owners.map((owner) => (
                  <div
                    key={owner.type}
                    className={`border-2 rounded-lg p-4 ${getOwnerColor(owner.type)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-700 mb-1">
                          {owner.type_ar}
                        </div>
                        {owner.name ? (
                          <>
                            <div className="font-bold text-gray-900 mb-1">{owner.name}</div>
                            <div className="text-xs text-gray-600">
                              تم التعيين: {owner.assigned_at ? new Date(owner.assigned_at).toLocaleDateString('ar-SA') : 'غير محدد'}
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-gray-500">لم يتم التعيين</div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedOwnerType(owner.type);
                          setShowAssignModal(true);
                        }}
                        className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-xs hover:bg-gray-50"
                      >
                        تغيير
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <History className="w-6 h-6 text-gray-600" />
                <h2 className="text-xl font-bold text-gray-900">السجل التنفيذي</h2>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                  آخر 20
                </span>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3 mb-2">
                      {log.result === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-1" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-1" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium mb-1 ${getActionTypeColor(log.action_type)}`}>
                          {log.action_title}
                        </div>
                        {log.target_name && (
                          <div className="text-xs text-gray-600 mb-1">
                            الهدف: {log.target_name}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>بواسطة: {log.executor_name}</span>
                          <span>•</span>
                          <span>{new Date(log.executed_at).toLocaleString('ar-SA')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {logs.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <History className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>لا يوجد سجل</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">تعيين مسؤول رسمي</h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المنصب
                </label>
                <select
                  value={selectedOwnerType}
                  onChange={(e) => setSelectedOwnerType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">اختر المنصب</option>
                  <option value="b2f">مساعد مدير B2F</option>
                  <option value="farm_command">مدير المزارع الوطني</option>
                  <option value="b2b">مساعد مدير B2B</option>
                  <option value="finance">المحاسب الرئيسي</option>
                  <option value="marketing">مدير التسويق</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الموظف
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">اختر الموظف</option>
                  {allStaff.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name_ar} - {staff.department}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedOwnerType('');
                  setSelectedStaffId('');
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                disabled={processing}
              >
                إلغاء
              </button>
              <button
                onClick={handleAssignOwner}
                disabled={!selectedOwnerType || !selectedStaffId || processing}
                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:bg-gray-300 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التعيين...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>تعيين</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
