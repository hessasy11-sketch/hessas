import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight, Activity } from 'lucide-react';

export default function ExecutiveOpsRoomCard() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/hq/executive-ops')}
      className="w-full bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-2xl p-8 text-right transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] border-2 border-gray-700 group relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-shadow">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">
                غرفة العمليات التنفيذية
              </h2>
              <p className="text-gray-300 text-sm">
                Executive Operations Command Center
              </p>
            </div>
          </div>
          <ArrowRight className="w-8 h-8 text-gray-400 group-hover:text-white group-hover:translate-x-2 transition-all duration-300" />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-gray-300">B2F Room</span>
            </div>
            <div className="text-sm font-medium text-white">غرفة المزارع</div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-300">B2B Room</span>
            </div>
            <div className="text-sm font-medium text-white">غرفة المزادات</div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-gray-300">Authority</span>
            </div>
            <div className="text-sm font-medium text-white">لوحة الصلاحيات</div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-300">Live Pulse</span>
            </div>
            <div className="text-sm font-medium text-white">نبض مباشر</div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-white/20">
          <p className="text-gray-300 text-sm leading-relaxed">
            مركز القيادة والسيطرة على جميع أقسام المنصة. رؤية شاملة للمؤشرات الحية، اعتماد القرارات الحرجة، وإدارة الصلاحيات التنفيذية.
          </p>
        </div>
      </div>
    </button>
  );
}
