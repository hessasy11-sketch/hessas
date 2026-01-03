import { useState } from 'react';
import { X, Settings, Zap, TrendingUp, Sliders, Filter, MapPin, Wrench, Palette, Activity, FileText, Eye } from 'lucide-react';
import { SmartControlCenter } from './settings/SmartControlCenter';
import { LiveMetrics } from './settings/LiveMetrics';
import { SliderMasterSettings } from './settings/SliderMasterSettings';
import { SmartFilters } from './settings/SmartFilters';
import { RegionsCitiesIntelligence } from './settings/RegionsCitiesIntelligence';
import { SellerToolsAdvanced } from './settings/SellerToolsAdvanced';
import { UIUXMasterControls } from './settings/UIUXMasterControls';
import { PerformanceSettings } from './settings/PerformanceSettings';
import { SmartLogs } from './settings/SmartLogs';
import { SystemHealthCheck } from './settings/SystemHealthCheck';

interface SmartSettingsDashboardProps {
  onClose: () => void;
}

type SettingsTab =
  | 'control'
  | 'metrics'
  | 'sliders'
  | 'filters'
  | 'regions'
  | 'tools'
  | 'ui'
  | 'performance'
  | 'logs'
  | 'health';

export function SmartSettingsDashboard({ onClose }: SmartSettingsDashboardProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('control');

  const tabs = [
    { id: 'control', label: 'مركز التحكم الذكي', icon: Zap, color: '#3B82F6' },
    { id: 'metrics', label: 'المقاييس اللحظية', icon: TrendingUp, color: '#10B981' },
    { id: 'sliders', label: 'إعدادات السلايدرات', icon: Sliders, color: '#F59E0B' },
    { id: 'filters', label: 'الفلترة الذكية', icon: Filter, color: '#8B5CF6' },
    { id: 'regions', label: 'المدن والمناطق', icon: MapPin, color: '#EF4444' },
    { id: 'tools', label: 'أدوات البائع', icon: Wrench, color: '#06B6D4' },
    { id: 'ui', label: 'إعدادات الواجهة', icon: Palette, color: '#EC4899' },
    { id: 'performance', label: 'الأداء', icon: Activity, color: '#84CC16' },
    { id: 'logs', label: 'السجلات', icon: FileText, color: '#6B7280' },
    { id: 'health', label: 'الفحص الصحي', icon: Eye, color: '#14B8A6' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'control':
        return <SmartControlCenter />;
      case 'metrics':
        return <LiveMetrics />;
      case 'sliders':
        return <SliderMasterSettings />;
      case 'filters':
        return <SmartFilters />;
      case 'regions':
        return <RegionsCitiesIntelligence />;
      case 'tools':
        return <SellerToolsAdvanced />;
      case 'ui':
        return <UIUXMasterControls />;
      case 'performance':
        return <PerformanceSettings />;
      case 'logs':
        return <SmartLogs />;
      case 'health':
        return <SystemHealthCheck />;
      default:
        return <SmartControlCenter />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl shadow-2xl w-full max-w-[98vw] max-h-[98vh] overflow-hidden flex flex-col"
        style={{
          animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden" style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          padding: '24px'
        }}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl -mr-48 -mt-48" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl -ml-48 -mb-48" />
          </div>

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Settings className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">الإعدادات العامة الذكية</h2>
                <p className="text-gray-300 text-sm">نظام إدارة متطور مدعوم بالذكاء الصناعي</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 flex items-center justify-center transition-all duration-200 hover:rotate-90"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4 space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as SettingsTab)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r text-white shadow-lg scale-105'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                    style={{
                      background: isActive ? `linear-gradient(135deg, ${tab.color}, ${tab.color}dd)` : undefined,
                    }}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {renderContent()}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
