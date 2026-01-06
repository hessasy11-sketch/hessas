import { useNavigate } from 'react-router-dom';
import { Sprout, UserX, AlertOctagon, CheckCircle, ExternalLink } from 'lucide-react';

interface FarmHealthCategory {
  id: string;
  name: string;
  location: string;
  created_at: string;
  overdue_count?: number;
}

interface FarmHealthRadarProps {
  newlyBorn: FarmHealthCategory[];
  noManager: FarmHealthCategory[];
  atRisk: FarmHealthCategory[];
  healthy: FarmHealthCategory[];
}

export default function FarmHealthRadar({
  newlyBorn,
  noManager,
  atRisk,
  healthy
}: FarmHealthRadarProps) {
  const navigate = useNavigate();

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return `منذ ${diffDays} يوم`;
  };

  const renderFarmCard = (farm: FarmHealthCategory, showOverdue?: boolean) => (
    <div
      key={farm.id}
      onClick={() => navigate(`/admin/b2f/farms/${farm.id}`)}
      className="bg-white rounded-lg border border-slate-200 p-3 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-900 text-sm truncate mb-1">{farm.name}</h4>
          <p className="text-xs text-slate-500 truncate">{farm.location}</p>
          <p className="text-xs text-slate-400 mt-1">{getTimeAgo(farm.created_at)}</p>
          {showOverdue && farm.overdue_count && farm.overdue_count > 0 && (
            <span className="inline-block mt-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">
              {farm.overdue_count} متأخر
            </span>
          )}
        </div>
        <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl border-2 border-emerald-200 p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
            <Sprout className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-900">مزارع جديدة</h3>
            <p className="text-xs text-emerald-600">Newly Born (7 days)</p>
          </div>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {newlyBorn.length > 0 ? (
            newlyBorn.map(farm => renderFarmCard(farm))
          ) : (
            <div className="text-center py-6 text-sm text-slate-500">
              لا توجد مزارع جديدة
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl border-2 border-amber-200 p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
            <UserX className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-900">بدون مدير</h3>
            <p className="text-xs text-amber-600">No Manager</p>
          </div>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {noManager.length > 0 ? (
            noManager.map(farm => renderFarmCard(farm))
          ) : (
            <div className="text-center py-6 text-sm text-slate-500">
              جميع المزارع لديها مدير
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border-2 border-red-200 p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center">
            <AlertOctagon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-900">مزارع متعثرة</h3>
            <p className="text-xs text-red-600">At Risk</p>
          </div>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {atRisk.length > 0 ? (
            atRisk.map(farm => renderFarmCard(farm, true))
          ) : (
            <div className="text-center py-6 text-sm text-slate-500">
              لا توجد مزارع متعثرة
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200 p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-900">مزارع جاهزة</h3>
            <p className="text-xs text-blue-600">Healthy</p>
          </div>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {healthy.length > 0 ? (
            healthy.map(farm => renderFarmCard(farm))
          ) : (
            <div className="text-center py-6 text-sm text-slate-500">
              لا توجد مزارع في هذه الفئة
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
