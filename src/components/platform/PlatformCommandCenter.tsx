import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Crown, Shield, Activity, AlertTriangle, FileText, X, Store, Sprout, ArrowRight, LogOut } from 'lucide-react';
import SmartDashboardView from './SmartDashboardView';
import StructurePermissionsView from './StructurePermissionsView';
import CriticalAlertsView from './CriticalAlertsView';
import ReportsView from './ReportsView';

interface Props {
  onClose: () => void;
  onNavigateToB2F?: () => void;
  onNavigateToAuctions?: () => void;
}

type TabType = 'dashboard' | 'structure' | 'alerts' | 'reports';

export default function PlatformCommandCenter({ onClose, onNavigateToB2F, onNavigateToAuctions }: Props) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [platformRole, setPlatformRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPlatformRole();
  }, []);

  const checkPlatformRole = async () => {
    try {
      const sessionData = localStorage.getItem('platform_staff_session');
      if (!sessionData) {
        alert('يجب عليك تسجيل الدخول أولاً من خلال بوابة الدخول الذكي');
        onClose();
        return;
      }

      const session = JSON.parse(sessionData);
      const staffRole = session.role;

      if (!['platform_owner', 'general_manager', 'super_admin'].includes(staffRole)) {
        alert('ليس لديك صلاحية الوصول لبوابة قيادة المنصة');
        onClose();
        return;
      }

      setPlatformRole(staffRole);
    } catch (error) {
      console.error('Error checking platform role:', error);
      alert('حدث خطأ في التحقق من الصلاحيات');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
      localStorage.removeItem('platform_staff_session');
      navigate('/admin/access', { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 via-gray-800 to-slate-900 text-white px-6 py-5 shadow-2xl">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-orange-500/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Crown className="w-9 h-9 text-orange-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-1">بوابة قيادة المنصة</h1>
                <p className="text-slate-300 text-sm">
                  الإدارة العليا - {platformRole === 'platform_owner' ? 'مالك المنصة' : 'مدير عام'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2 transition-all text-sm"
              >
                <LogOut className="w-5 h-5" />
                خروج
              </button>
              <button
                onClick={onClose}
                className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex-1 max-w-xs px-6 py-4 font-bold transition-all flex items-center justify-center gap-2 border-b-4 whitespace-nowrap ${
                  activeTab === 'dashboard'
                    ? 'border-orange-500 text-orange-600 bg-orange-50'
                    : 'border-transparent text-gray-600 hover:text-orange-600 hover:bg-gray-50'
                }`}
              >
                <Activity className="w-5 h-5" />
                لوحة القيادة
              </button>
              <button
                onClick={() => setActiveTab('structure')}
                className={`flex-1 max-w-xs px-6 py-4 font-bold transition-all flex items-center justify-center gap-2 border-b-4 whitespace-nowrap ${
                  activeTab === 'structure'
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                <Shield className="w-5 h-5" />
                الهيكلة والصلاحيات
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`flex-1 max-w-xs px-6 py-4 font-bold transition-all flex items-center justify-center gap-2 border-b-4 whitespace-nowrap ${
                  activeTab === 'reports'
                    ? 'border-teal-500 text-teal-600 bg-teal-50'
                    : 'border-transparent text-gray-600 hover:text-teal-600 hover:bg-gray-50'
                }`}
              >
                <FileText className="w-5 h-5" />
                تقارير التوثيق
              </button>
              <button
                onClick={() => setActiveTab('alerts')}
                className={`flex-1 max-w-xs px-6 py-4 font-bold transition-all flex items-center justify-center gap-2 border-b-4 whitespace-nowrap ${
                  activeTab === 'alerts'
                    ? 'border-red-500 text-red-600 bg-red-50'
                    : 'border-transparent text-gray-600 hover:text-red-600 hover:bg-gray-50'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
                التنبيهات
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-7xl mx-auto p-6">
            {activeTab === 'dashboard' && (
              <SmartDashboardView
                onNavigateToB2F={onNavigateToB2F}
                onNavigateToAuctions={onNavigateToAuctions}
              />
            )}
            {activeTab === 'structure' && <StructurePermissionsView platformRole={platformRole} />}
            {activeTab === 'reports' && <ReportsView />}
            {activeTab === 'alerts' && <CriticalAlertsView />}
          </div>
        </div>
      </div>
    </div>
  );
}
