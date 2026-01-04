import { useState } from 'react';
import { X, Building2 } from 'lucide-react';
import { adminSessionManager } from '../../utils/adminSessionManager';

interface FarmContext {
  farm_id: string;
  farm_name: string;
  role: string;
}

interface FarmSelectorModalProps {
  onSelect: (farmId: string) => void;
  onClose: () => void;
}

export function FarmSelectorModal({ onSelect, onClose }: FarmSelectorModalProps) {
  const farms = adminSessionManager.getAvailableFarms();
  const [selectedFarm, setSelectedFarm] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedFarm) {
      adminSessionManager.setCurrentFarm(selectedFarm);
      onSelect(selectedFarm);
      onClose();
    }
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      farm_manager: 'مدير المزرعة',
      farm_supervisor: 'مشرف المزرعة',
      operations: 'عمليات',
      finance: 'مالية'
    };
    return roleLabels[role] || role;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">اختر المزرعة</h2>
              <p className="text-sm text-gray-600 mt-0.5">حدد المزرعة التي تريد العمل عليها</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-3">
            {farms.map((farm) => (
              <button
                key={farm.farm_id}
                onClick={() => setSelectedFarm(farm.farm_id)}
                className={`w-full p-4 rounded-xl border-2 transition-all text-right ${
                  selectedFarm === farm.farm_id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{farm.farm_name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      الدور: <span className="font-medium text-green-600">{getRoleLabel(farm.role)}</span>
                    </p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedFarm === farm.farm_id
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedFarm === farm.farm_id && (
                      <div className="w-3 h-3 bg-white rounded-full" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {farms.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-5xl mb-4">🏞️</div>
              <p className="text-gray-600">لا توجد مزارع متاحة</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={!selectedFarm}
            className="flex-1 py-3 px-6 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            تأكيد الاختيار
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 border-2 border-gray-300 rounded-xl font-bold hover:bg-gray-50 transition-all"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
