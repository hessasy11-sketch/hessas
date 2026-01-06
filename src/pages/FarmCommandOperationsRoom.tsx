import React, { useState } from 'react';
import { useFarmCommand } from '../hooks/useFarmCommand';
import FarmCommandPulseBar from '../components/platform/FarmCommandPulseBar';
import FarmHealthRadar from '../components/platform/FarmHealthRadar';
import FarmsCompactList from '../components/platform/FarmsCompactList';
import AssignManagerQuickModal from '../components/platform/AssignManagerQuickModal';
import SuspendFarmQuickModal from '../components/platform/SuspendFarmQuickModal';
import { RefreshCw } from 'lucide-react';

const FarmCommandOperationsRoom: React.FC = () => {
  const {
    pulse,
    healthCategories,
    farmsList,
    loading,
    error,
    refetch,
    assignManager,
    suspendFarm,
    toggleBookings,
    escalateExpenseDecision
  } = useFarmCommand();

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);

  // Get current staff ID from session
  const getCurrentStaffId = () => {
    return sessionStorage.getItem('current_staff_id') || '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">جاري تحميل غرفة عمليات قيادة المزارع...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">حدث خطأ</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-6" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">غرفة عمليات قيادة المزارع</h1>
            <p className="text-slate-600">Farm Command Operations Room</p>
          </div>
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-200 rounded-lg hover:border-emerald-500 hover:text-emerald-600 transition-all font-medium"
          >
            <RefreshCw className="w-5 h-5" />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* Pulse Bar */}
      {pulse && (
        <FarmCommandPulseBar
          activeFarms={pulse.active_farms}
          atRiskFarms={pulse.at_risk_farms}
          pendingDecisions={pulse.pending_decisions}
          highExpensesToday={pulse.high_expenses_today}
        />
      )}

      {/* Farm Health Radar */}
      {healthCategories && (
        <FarmHealthRadar
          newlyBorn={healthCategories.newly_born || []}
          noManager={healthCategories.no_manager || []}
          atRisk={healthCategories.at_risk || []}
          healthy={healthCategories.healthy || []}
        />
      )}

      {/* Farms Compact List */}
      <FarmsCompactList farms={farmsList} />

      {/* Quick Actions Section */}
      <div className="mt-6 bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">إجراءات سريعة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => setShowAssignModal(true)}
            className="px-6 py-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all font-bold"
          >
            تعيين مدير
          </button>
          <button
            onClick={() => setShowSuspendModal(true)}
            className="px-6 py-4 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl hover:shadow-lg transition-all font-bold"
          >
            تعليق مزرعة
          </button>
          <button
            onClick={async () => {
              const farmId = prompt('أدخل معرف المزرعة:');
              if (!farmId) return;

              const currentlyEnabled = confirm('هل تريد فتح الحجوزات؟\nاضغط Cancel لإغلاقها');
              const reason = prompt('السبب (اختياري):');

              const result = await toggleBookings(
                farmId,
                currentlyEnabled,
                getCurrentStaffId(),
                reason || undefined
              );

              if (result.success) {
                alert('تم تغيير حالة الحجوزات بنجاح');
              } else {
                alert(`فشل: ${result.error}`);
              }
            }}
            className="px-6 py-4 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl hover:shadow-lg transition-all font-bold"
          >
            تبديل الحجوزات
          </button>
          <button
            onClick={async () => {
              const farmId = prompt('أدخل معرف المزرعة:');
              if (!farmId) return;

              const amountStr = prompt('المبلغ (ر.س):');
              if (!amountStr) return;

              const amount = parseFloat(amountStr);
              if (isNaN(amount)) {
                alert('المبلغ غير صحيح');
                return;
              }

              const description = prompt('وصف المصروف:');
              if (!description) return;

              const result = await escalateExpenseDecision(
                farmId,
                amount,
                description,
                getCurrentStaffId(),
                'high'
              );

              if (result.success) {
                alert('تم رفع القرار بنجاح');
              } else {
                alert(`فشل: ${result.error}`);
              }
            }}
            className="px-6 py-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-bold"
          >
            رفع قرار مصروف
          </button>
        </div>
      </div>

      {/* Modals */}
      {showAssignModal && (
        <AssignManagerQuickModal
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedFarmId(null);
          }}
          onAssign={async (farmId, managerId, reason) => {
            const result = await assignManager(
              farmId,
              managerId,
              getCurrentStaffId(),
              reason
            );

            if (result.success) {
              alert('تم تعيين المدير بنجاح');
              setShowAssignModal(false);
              setSelectedFarmId(null);
            } else {
              alert(`فشل: ${result.error}`);
            }
          }}
        />
      )}

      {showSuspendModal && (
        <SuspendFarmQuickModal
          isOpen={showSuspendModal}
          onClose={() => {
            setShowSuspendModal(false);
            setSelectedFarmId(null);
          }}
          onSuspend={async (farmId, reason) => {
            const result = await suspendFarm(
              farmId,
              getCurrentStaffId(),
              reason
            );

            if (result.success) {
              alert('تم تعليق المزرعة بنجاح');
              setShowSuspendModal(false);
              setSelectedFarmId(null);
            } else {
              alert(`فشل: ${result.error}`);
            }
          }}
        />
      )}
    </div>
  );
};

export default FarmCommandOperationsRoom;
