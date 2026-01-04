import { useState } from 'react';
import { DynamicDepartmentsHub } from './DynamicDepartmentsHub';
import { StaffIDCardPrinter } from '../StaffIDCardPrinter';
import { QrCode, Building2, Users } from 'lucide-react';

export function WorkManagementHub() {
  const [activeTab, setActiveTab] = useState<'departments' | 'qr'>('departments');

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('departments')}
            className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'departments'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Building2 className="w-5 h-5" />
            إدارة الأقسام
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'qr'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <QrCode className="w-5 h-5" />
            بطاقات الموظفين
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'departments' && <DynamicDepartmentsHub />}
      {activeTab === 'qr' && <StaffIDCardPrinter />}
    </div>
  );
}
