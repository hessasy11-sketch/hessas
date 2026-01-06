import { useNavigate } from 'react-router-dom';
import {
  Leaf,
  ArrowLeft,
  Activity,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { useFarmCommand } from '../../hooks/useFarmCommand';
import BackToGatewayButton from './BackToGatewayButton';
import FarmCommandPulseBar from './FarmCommandPulseBar';
import FarmHealthRadar from './FarmHealthRadar';
import FarmsCompactList from './FarmsCompactList';
import FarmCommandQuickActions from './FarmCommandQuickActions';

export default function B2FOperationsRoom() {
  const navigate = useNavigate();
  const { pulse, healthCategories, farmsList, loading, error, refetch } = useFarmCommand();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50" dir="rtl">
      <BackToGatewayButton />

      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 border-b border-emerald-700 shadow-xl">
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/operations-room')}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-lg">
                <Leaf className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">غرفة عمليات قيادة المزارع</h1>
                <p className="text-emerald-200 text-sm">Farm Command Operations Room</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={refetch}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
                <span className="text-white text-sm font-medium">تحديث</span>
              </button>
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
                <Activity className="w-4 h-4 text-emerald-300 animate-pulse" />
                <span className="text-emerald-200 text-sm font-medium">مباشر</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {loading && !pulse ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            <span className="mr-4 text-slate-600">جاري تحميل البيانات...</span>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-red-600 font-medium mb-4">{error}</p>
            <button
              onClick={refetch}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <>
            {pulse && (
              <FarmCommandPulseBar
                activeFarms={pulse.active_farms}
                atRiskFarms={pulse.at_risk_farms}
                pendingDecisions={pulse.pending_decisions}
                highExpensesToday={pulse.high_expenses_today}
              />
            )}

            {healthCategories && (
              <FarmHealthRadar
                newlyBorn={healthCategories.newly_born}
                noManager={healthCategories.no_manager}
                atRisk={healthCategories.at_risk}
                healthy={healthCategories.healthy}
              />
            )}

            <div className="mb-6">
              <FarmCommandQuickActions onActionComplete={refetch} />
            </div>

            <FarmsCompactList farms={farmsList} />
          </>
        )}
      </div>
    </div>
  );
}
