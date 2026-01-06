import { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  UserMinus,
  CheckCircle2,
  Circle,
  AlertCircle,
  Send,
  Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FarmPosition {
  id: string;
  position_key: string;
  title_ar: string;
  title_en: string;
  status: 'vacant' | 'assigned';
  is_required: boolean;
  assigned_staff_id: string | null;
  assigned_staff_name: string | null;
  assigned_staff_code: string | null;
  assigned_at: string | null;
  notes: string | null;
  created_at: string;
}

interface StaffRequest {
  id: string;
  position_id: string;
  position_title_ar: string;
  requested_role: string;
  status: string;
  requested_by_name: string;
  created_at: string;
}

interface AvailableStaff {
  id: string;
  staff_code: string;
  name: string;
  role: string;
  department: string;
  is_available: boolean;
}

interface FarmPositionsManagementProps {
  farmId: string;
  farmName: string;
}

export default function FarmPositionsManagement({ farmId, farmName }: FarmPositionsManagementProps) {
  const [positions, setPositions] = useState<FarmPosition[]>([]);
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modals state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<FarmPosition | null>(null);
  const [availableStaff, setAvailableStaff] = useState<AvailableStaff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [requestNotes, setRequestNotes] = useState('');

  useEffect(() => {
    loadPositionsData();
  }, [farmId]);

  const loadPositionsData = async () => {
    try {
      setLoading(true);

      // Load positions
      const { data: positionsData } = await supabase.rpc('get_farm_positions', {
        p_farm_id: farmId
      });

      if (positionsData) {
        setPositions(positionsData);
      }

      // Load requests
      const { data: requestsData } = await supabase.rpc('get_farm_staff_requests', {
        p_farm_id: farmId,
        p_status_filter: 'pending'
      });

      if (requestsData) {
        setRequests(requestsData);
      }
    } catch (error) {
      console.error('Error loading positions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAssignModal = async (position: FarmPosition) => {
    setSelectedPosition(position);
    setSelectedStaffId('');

    try {
      // Load available staff
      const { data } = await supabase.rpc('get_available_staff_for_position', {
        p_farm_id: farmId,
        p_position_key: position.position_key
      });

      if (data) {
        setAvailableStaff(data);
      }
    } catch (error) {
      console.error('Error loading staff:', error);
    }

    setShowAssignModal(true);
  };

  const handleOpenRequestModal = (position: FarmPosition) => {
    setSelectedPosition(position);
    setRequestNotes('');
    setShowRequestModal(true);
  };

  const handleAssignStaff = async () => {
    if (!selectedPosition || !selectedStaffId) {
      alert('الرجاء اختيار موظف');
      return;
    }

    setActionLoading('assign');
    try {
      const currentStaffId = sessionStorage.getItem('current_staff_id');
      if (!currentStaffId) {
        alert('لا يمكن تحديد هوية المستخدم');
        return;
      }

      const { data, error } = await supabase.rpc('assign_existing_staff_to_position', {
        p_position_id: selectedPosition.id,
        p_staff_id: selectedStaffId,
        p_assigned_by_staff_id: currentStaffId,
        p_notes: null
      });

      if (error) throw error;

      if (data?.success) {
        alert(data.message_ar);
        setShowAssignModal(false);
        loadPositionsData();
      } else {
        alert(data?.message_ar || 'فشل التعيين');
      }
    } catch (error: any) {
      console.error('Error assigning staff:', error);
      alert('حدث خطأ: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnassignStaff = async (position: FarmPosition) => {
    if (!confirm('هل أنت متأكد من إلغاء تعيين هذا الموظف؟')) return;

    setActionLoading(`unassign-${position.id}`);
    try {
      const currentStaffId = sessionStorage.getItem('current_staff_id');
      if (!currentStaffId) {
        alert('لا يمكن تحديد هوية المستخدم');
        return;
      }

      const { data, error } = await supabase.rpc('unassign_staff_from_position', {
        p_position_id: position.id,
        p_unassigned_by_staff_id: currentStaffId,
        p_reason: 'تم إلغاء التعيين من لوحة المزرعة'
      });

      if (error) throw error;

      if (data?.success) {
        alert(data.message_ar);
        loadPositionsData();
      } else {
        alert(data?.message_ar || 'فشل إلغاء التعيين');
      }
    } catch (error: any) {
      console.error('Error unassigning staff:', error);
      alert('حدث خطأ: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateRequest = async () => {
    if (!selectedPosition) return;

    setActionLoading('request');
    try {
      const currentStaffId = sessionStorage.getItem('current_staff_id');
      if (!currentStaffId) {
        alert('لا يمكن تحديد هوية المستخدم');
        return;
      }

      const { data, error } = await supabase.rpc('create_staff_request', {
        p_farm_id: farmId,
        p_position_id: selectedPosition.id,
        p_requested_by_staff_id: currentStaffId,
        p_notes: requestNotes || null
      });

      if (error) throw error;

      if (data?.success) {
        alert(data.message_ar);
        setShowRequestModal(false);
        loadPositionsData();
      } else {
        alert(data?.message_ar || 'فشل إرسال الطلب');
      }
    } catch (error: any) {
      console.error('Error creating request:', error);
      alert('حدث خطأ: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getPositionIcon = (key: string) => {
    switch (key) {
      case 'field_supervisor': return '👨‍🌾';
      case 'agri_engineer': return '👨‍🔬';
      case 'technician': return '🔧';
      case 'worker': return '👷';
      case 'factory_supervisor': return '🏭';
      default: return '👤';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-7 h-7 text-emerald-600" />
            المقاعد الوظيفية
          </h2>
          <p className="text-gray-600 mt-1">إدارة هيكل الفريق التشغيلي للمزرعة</p>
        </div>
      </div>

      {/* Pending Requests Alert */}
      {requests.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-amber-900 mb-1">طلبات معلقة</h4>
              <p className="text-sm text-amber-800">
                يوجد {requests.length} طلب موظف معلق في انتظار موافقة GM
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Positions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {positions.map((position) => {
          const isAssigned = position.status === 'assigned';
          const hasRequest = requests.some(r => r.position_id === position.id);

          return (
            <div
              key={position.id}
              className={`bg-white rounded-xl shadow-lg border-2 transition-all ${
                isAssigned
                  ? 'border-green-200 hover:border-green-300'
                  : hasRequest
                  ? 'border-amber-200 hover:border-amber-300'
                  : 'border-gray-200 hover:border-emerald-300'
              }`}
            >
              {/* Position Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start gap-4">
                  <div className="text-5xl">{getPositionIcon(position.position_key)}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {position.title_ar}
                    </h3>
                    <p className="text-sm text-gray-500">{position.title_en}</p>
                    {position.is_required && (
                      <span className="inline-block mt-2 text-xs px-2 py-1 bg-red-50 text-red-700 rounded-full border border-red-200">
                        مطلوب
                      </span>
                    )}
                  </div>
                  <div>
                    {isAssigned ? (
                      <CheckCircle2 className="w-8 h-8 text-green-500" />
                    ) : (
                      <Circle className="w-8 h-8 text-gray-300" />
                    )}
                  </div>
                </div>
              </div>

              {/* Position Body */}
              <div className="p-6">
                {isAssigned ? (
                  <>
                    <div className="bg-green-50 rounded-lg p-4 mb-4 border border-green-100">
                      <p className="text-sm font-medium text-green-900 mb-1">الموظف المعيّن</p>
                      <p className="text-lg font-bold text-green-700">
                        {position.assigned_staff_name}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {position.assigned_staff_code}
                      </p>
                      {position.assigned_at && (
                        <p className="text-xs text-green-600 mt-2">
                          تم التعيين: {new Date(position.assigned_at).toLocaleDateString('ar-SA')}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleUnassignStaff(position)}
                      disabled={actionLoading === `unassign-${position.id}`}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      <UserMinus className="w-5 h-5" />
                      {actionLoading === `unassign-${position.id}` ? 'جاري الإلغاء...' : 'إلغاء التعيين'}
                    </button>
                  </>
                ) : hasRequest ? (
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                    <p className="text-sm font-medium text-amber-900 mb-1">طلب معلق</p>
                    <p className="text-sm text-amber-700">
                      تم إرسال طلب توظيف لهذا المقعد. في انتظار موافقة GM.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <p className="text-sm font-medium text-gray-600 text-center">
                        المقعد فارغ
                      </p>
                    </div>

                    <button
                      onClick={() => handleOpenAssignModal(position)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                    >
                      <UserPlus className="w-5 h-5" />
                      تعيين موظف موجود
                    </button>

                    <button
                      onClick={() => handleOpenRequestModal(position)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <Send className="w-5 h-5" />
                      طلب إنشاء حساب موظف
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Assign Existing Staff Modal */}
      {showAssignModal && selectedPosition && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6">
              <h3 className="text-2xl font-bold text-white">تعيين موظف موجود</h3>
              <p className="text-emerald-100 mt-1">{selectedPosition.title_ar}</p>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="bg-emerald-50 rounded-xl p-4 mb-4 border border-emerald-200">
                <p className="text-sm font-medium text-emerald-900 mb-1">المزرعة</p>
                <p className="text-lg font-bold text-emerald-700">{farmName}</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  اختر الموظف <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                >
                  <option value="">-- اختر موظف --</option>
                  {availableStaff.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} - {staff.staff_code} ({staff.role})
                    </option>
                  ))}
                </select>
              </div>

              {availableStaff.length === 0 && (
                <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-sm text-amber-800">
                    لا يوجد موظفين متاحين. يمكنك طلب إنشاء حساب موظف جديد.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex gap-3">
              <button
                onClick={handleAssignStaff}
                disabled={!selectedStaffId || actionLoading === 'assign'}
                className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === 'assign' ? 'جاري التعيين...' : 'تعيين الآن'}
              </button>
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request New Staff Modal */}
      {showRequestModal && selectedPosition && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
              <h3 className="text-2xl font-bold text-white">طلب إنشاء حساب موظف</h3>
              <p className="text-blue-100 mt-1">{selectedPosition.title_ar}</p>
            </div>

            <div className="p-6">
              <div className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-1">المزرعة</p>
                <p className="text-lg font-bold text-blue-700">{farmName}</p>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-700 mb-2">
                  سيتم إرسال طلبك إلى المدير العام (GM) للموافقة على إنشاء حساب موظف جديد لهذا المقعد.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ملاحظات (اختياري)
                </label>
                <textarea
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  rows={4}
                  placeholder="أضف أي ملاحظات أو متطلبات خاصة..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
                />
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex gap-3">
              <button
                onClick={handleCreateRequest}
                disabled={actionLoading === 'request'}
                className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === 'request' ? 'جاري الإرسال...' : 'إرسال الطلب'}
              </button>
              <button
                onClick={() => setShowRequestModal(false)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
