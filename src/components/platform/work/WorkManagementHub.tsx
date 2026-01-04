import { useState } from 'react';
import { Shield, FileText, Users, Network, Zap, BarChart3, Activity, Settings } from 'lucide-react';
import { PermissionPacksSection } from './PermissionPacksSection';
import { TaskTemplatesSection } from './TaskTemplatesSection';
import { StaffManagementSection } from './StaffManagementSection';
import { TeamsStructureSection } from './TeamsStructureSection';
import { AutoTaskAssignment } from './AutoTaskAssignment';
import { SmartTaskGenerationHub } from './SmartTaskGenerationHub';
import { LiveTaskDashboard } from './LiveTaskDashboard';
import { AutoTaskRulesManager } from './AutoTaskRulesManager';

type TabType = 'permissions' | 'tasks' | 'staff' | 'teams' | 'assign' | 'monitor' | 'live' | 'rules';

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

          <button
            onClick={() => setActiveTab('assign')}
            className={`flex-1 min-w-[150px] px-6 py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'assign'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Zap className="w-5 h-5" />
            <span>توليد المهام</span>
          </button>

          <button
            onClick={() => setActiveTab('monitor')}
            className={`flex-1 min-w-[150px] px-6 py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'monitor'
                ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>الإحصائيات</span>
          </button>

          <button
            onClick={() => setActiveTab('live')}
            className={`flex-1 min-w-[150px] px-6 py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'live'
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span>مباشر</span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`flex-1 min-w-[150px] px-6 py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'rules'
                ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span>قواعد التوليد</span>
          </button>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
        {activeTab === 'permissions' && <PermissionPacksSection />}
        {activeTab === 'tasks' && <TaskTemplatesSection />}
        {activeTab === 'staff' && <StaffManagementSection />}
        {activeTab === 'teams' && <TeamsStructureSection />}
        {activeTab === 'assign' && <AutoTaskAssignment />}
        {activeTab === 'monitor' && <SmartTaskGenerationHub />}
        {activeTab === 'live' && <LiveTaskDashboard />}
        {activeTab === 'rules' && <AutoTaskRulesManager />}
      </div>
    </div>
  );
}
