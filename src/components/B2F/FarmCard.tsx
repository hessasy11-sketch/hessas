import { MapPin, TreePine, TrendingUp, FileCheck, ChevronLeft, Power, PowerOff } from 'lucide-react';
import { B2FFarm } from '../../hooks/useB2FFarms';

interface FarmCardProps {
  farm: B2FFarm;
  opportunitiesCount: number;
  requestsCount: number;
  onClick: () => void;
  onToggleStatus: () => void;
}

export default function FarmCard({
  farm,
  opportunitiesCount,
  requestsCount,
  onClick,
  onToggleStatus
}: FarmCardProps) {
  return (
    <div className="group bg-white rounded-3xl border-2 border-emerald-100 overflow-hidden hover:shadow-2xl hover:border-emerald-300 transition-all duration-300">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        <div className="relative p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <MapPin className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-gray-900 mb-1">
                    {farm.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {farm.location}
                      {farm.city && ` - ${farm.city}`}
                    </span>
                  </div>
                </div>
              </div>

              {farm.description && (
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-3 mb-4 line-clamp-2">
                  {farm.description}
                </p>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border-2 border-emerald-100">
                  <div className="flex items-center gap-2 mb-1.5">
                    <TreePine className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-700">الأشجار</span>
                  </div>
                  <p className="text-xl font-black text-emerald-900">
                    {farm.total_trees_available.toLocaleString()}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border-2 border-amber-100">
                  <div className="flex items-center gap-2 mb-1.5">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-medium text-amber-700">العروض</span>
                  </div>
                  <p className="text-xl font-black text-amber-900">
                    {opportunitiesCount}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border-2 border-blue-100">
                  <div className="flex items-center gap-2 mb-1.5">
                    <FileCheck className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700">الطلبات</span>
                  </div>
                  <p className="text-xl font-black text-blue-900">
                    {requestsCount}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t-2 border-gray-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStatus();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 ${
                farm.is_active
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {farm.is_active ? (
                <>
                  <Power className="w-4 h-4" />
                  <span>مفعلة</span>
                </>
              ) : (
                <>
                  <PowerOff className="w-4 h-4" />
                  <span>موقوفة</span>
                </>
              )}
            </button>

            <button
              onClick={onClick}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl py-2.5 px-4 font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <span>إدارة المزرعة</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-1000 pointer-events-none"></div>
      </div>
    </div>
  );
}
