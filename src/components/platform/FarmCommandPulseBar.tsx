import { Activity, AlertTriangle, Clock, DollarSign } from 'lucide-react';

interface FarmCommandPulseBarProps {
  activeFarms: number;
  atRiskFarms: number;
  pendingDecisions: number;
  highExpensesToday: number;
}

export default function FarmCommandPulseBar({
  activeFarms,
  atRiskFarms,
  pendingDecisions,
  highExpensesToday
}: FarmCommandPulseBarProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200">
        <div className="flex items-center justify-between mb-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <span className="text-sm font-medium opacity-90">مزارع نشطة</span>
        </div>
        <div className="text-4xl font-bold mb-1">{activeFarms}</div>
        <div className="text-sm opacity-80">Active Farms</div>
      </div>

      <div className={`bg-gradient-to-br rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200 ${
        atRiskFarms > 0 ? 'from-red-500 to-red-600' : 'from-slate-400 to-slate-500'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <span className="text-sm font-medium opacity-90">تحتاج تدخل</span>
        </div>
        <div className="text-4xl font-bold mb-1">{atRiskFarms}</div>
        <div className="text-sm opacity-80">At Risk</div>
      </div>

      <div className={`bg-gradient-to-br rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200 ${
        pendingDecisions > 0 ? 'from-amber-500 to-amber-600' : 'from-slate-400 to-slate-500'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <span className="text-sm font-medium opacity-90">قرارات معلقة</span>
        </div>
        <div className="text-4xl font-bold mb-1">{pendingDecisions}</div>
        <div className="text-sm opacity-80">Pending Decisions</div>
      </div>

      <div className={`bg-gradient-to-br rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200 ${
        highExpensesToday > 0 ? 'from-orange-500 to-orange-600' : 'from-slate-400 to-slate-500'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <span className="text-sm font-medium opacity-90">مصروفات حرجة اليوم</span>
        </div>
        <div className="text-3xl font-bold mb-1">{formatCurrency(highExpensesToday)}</div>
        <div className="text-sm opacity-80">ر.س (≥5000)</div>
      </div>
    </div>
  );
}
