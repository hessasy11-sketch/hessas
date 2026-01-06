import { useState } from 'react';
import { UserPlus, Ban, DollarSign } from 'lucide-react';
import AssignManagerQuickModal from './AssignManagerQuickModal';
import SuspendFarmQuickModal from './SuspendFarmQuickModal';

interface FarmCommandQuickActionsProps {
  onActionComplete: () => void;
}

export default function FarmCommandQuickActions({ onActionComplete }: FarmCommandQuickActionsProps) {
  const [showAssignManager, setShowAssignManager] = useState(false);
  const [showSuspendFarm, setShowSuspendFarm] = useState(false);

  return (
    <>
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border-2 border-slate-200 p-6 shadow-lg">
        <h2 className="text-lg font-bold text-slate-900 mb-4">إجراءات قيادية سريعة</h2>
        <p className="text-sm text-slate-600 mb-6">Quick Actions - تتطلب تأكيد وسبب</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setShowAssignManager(true)}
            className="flex items-center gap-3 p-4 bg-white hover:bg-emerald-50 border-2 border-slate-200 hover:border-emerald-500 rounded-xl transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-100 group-hover:bg-emerald-500 flex items-center justify-center transition-colors">
              <UserPlus className="w-6 h-6 text-emerald-600 group-hover:text-white transition-colors" />
            </div>
            <div className="text-right flex-1">
              <div className="font-bold text-slate-900 text-sm">تعيين/تغيير مدير</div>
              <div className="text-xs text-slate-500">Assign Manager</div>
            </div>
          </button>

          <button
            onClick={() => setShowSuspendFarm(true)}
            className="flex items-center gap-3 p-4 bg-white hover:bg-red-50 border-2 border-slate-200 hover:border-red-500 rounded-xl transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-red-100 group-hover:bg-red-500 flex items-center justify-center transition-colors">
              <Ban className="w-6 h-6 text-red-600 group-hover:text-white transition-colors" />
            </div>
            <div className="text-right flex-1">
              <div className="font-bold text-slate-900 text-sm">تعليق مزرعة</div>
              <div className="text-xs text-slate-500">Suspend Farm</div>
            </div>
          </button>

          <button
            className="flex items-center gap-3 p-4 bg-white border-2 border-slate-200 rounded-xl opacity-60 cursor-not-allowed"
            disabled
          >
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-right flex-1">
              <div className="font-bold text-slate-900 text-sm">رفع مصروف كبير</div>
              <div className="text-xs text-slate-500">من داخل المزرعة</div>
            </div>
          </button>
        </div>
      </div>

      {showAssignManager && (
        <AssignManagerQuickModal
          onClose={() => setShowAssignManager(false)}
          onSuccess={() => {
            setShowAssignManager(false);
            onActionComplete();
          }}
        />
      )}

      {showSuspendFarm && (
        <SuspendFarmQuickModal
          onClose={() => setShowSuspendFarm(false)}
          onSuccess={() => {
            setShowSuspendFarm(false);
            onActionComplete();
          }}
        />
      )}
    </>
  );
}
