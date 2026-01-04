import { useState } from 'react';
import { Shield, FileText, Users, Network } from 'lucide-react';
import { PermissionPacksSection } from './PermissionPacksSection';
import { TaskTemplatesSection } from './TaskTemplatesSection';
import { StaffManagementSection } from './StaffManagementSection';
import { TeamsStructureSection } from './TeamsStructureSection';

type TabType = 'permissions' | 'tasks' | 'staff' | 'teams';

export function WorkManagementHub() {
  const [activeTab, setActiveTab] = useState<TabType>('permissions');

  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-2">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex-1 min-w-[150px] px-6 py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'permissions'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield className="w-5 h-5" />
            <span>حزم الصلاحيات</span>
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 min-w-[150px] px-6 py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'tasks'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>قوالب المهام</span>
          </button>

          <button
            onClick={() => setActiveTab('staff')}
            className={`flex-1 min-w-[150px] px-6 py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'staff'
                ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>إدارة الموظفين</span>
          </button>

          <button
            onClick={() => setActiveTab('teams')}
            className={`flex-1 min-w-[150px] px-6 py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'teams'
                ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Network className="w-5 h-5" />
            <span>الفرق والهيكل</span>
          </button>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
        {activeTab === 'permissions' && <PermissionPacksSection />}
        {activeTab === 'tasks' && <TaskTemplatesSection />}
        {activeTab === 'staff' && <StaffManagementSection />}
        {activeTab === 'teams' && <TeamsStructureSection />}
      </div>
    </div>
  );
}
