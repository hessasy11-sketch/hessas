import { useState } from 'react';
import { Wrench, ListChecks, AlertTriangle, Clipboard, Plus } from 'lucide-react';
import DailyTasksView from './DailyTasksView';
import IssueReportsView from './IssueReportsView';
import MaintenanceLogView from './MaintenanceLogView';
import EquipmentView from './EquipmentView';

interface OpsLiteHubProps {
  farmId: string;
}

type Tab = 'tasks' | 'issues' | 'maintenance' | 'equipment';

export default function OpsLiteHub({ farmId }: OpsLiteHubProps) {
  const [activeTab, setActiveTab] = useState<Tab>('tasks');

  const tabs = [
    { id: 'tasks' as Tab, name: 'المهام اليومية', icon: ListChecks, color: 'emerald' },
    { id: 'issues' as Tab, name: 'بلاغات الأعطال', icon: AlertTriangle, color: 'red' },
    { id: 'maintenance' as Tab, name: 'سجل الصيانة', icon: Wrench, color: 'blue' },
    { id: 'equipment' as Tab, name: 'المعدات', icon: Clipboard, color: 'amber' },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">التشغيل الخفيف (Ops Lite)</h2>
        <p className="text-sm text-gray-600 mt-1">
          إدارة المهام اليومية والصيانة والمعدات
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? `border-${tab.color}-500 text-${tab.color}-600`
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'tasks' && <DailyTasksView farmId={farmId} />}
        {activeTab === 'issues' && <IssueReportsView farmId={farmId} />}
        {activeTab === 'maintenance' && <MaintenanceLogView farmId={farmId} />}
        {activeTab === 'equipment' && <EquipmentView farmId={farmId} />}
      </div>
    </div>
  );
}
