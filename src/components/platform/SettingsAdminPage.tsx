import { ArrowRight, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SessionTracker } from './SessionTracker';

export function SettingsAdminPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" dir="rtl">
      <SessionTracker />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                  <Settings className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    الإعدادات المتقدمة
                  </h1>
                  <p className="text-gray-400 text-sm mt-1">
                    قريباً - قيد التطوير
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/hq', { replace: true })}
              className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-slate-600"
            >
              <ArrowRight className="w-5 h-5" />
              <span>العودة</span>
            </button>
          </div>
        </div>

        <div className="p-8 rounded-2xl bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/20 text-center">
          <Settings className="w-16 h-16 text-orange-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">قيد التطوير</h2>
          <p className="text-gray-400">
            صفحة الإعدادات المتقدمة قيد الإنشاء
          </p>
        </div>
      </div>
    </div>
  );
}
